import { applyCommand, playerView } from './commands';
import { bestAsk, bestBid, cancelAgentOrders, GE_TAX_RATE, placeOrder } from './exchange';
import { itemDef } from './items';
import type { RNG } from './rng';
import type { AgentKind, AgentState, ItemDef, ItemId, WorldEvent, WorldState } from './types';

/** Speculators are greedy, not insane: NPC speculative orders stay inside a
 * wide fundamental band, which bounds event bubbles/crashes at world level. */
function saneClamp(def: ItemDef, price: number): number {
  const floor = Math.max(1, Math.round(def.baseCost * 0.55));
  const ceil = Math.round(def.consumeValue * 1.25);
  return Math.min(ceil, Math.max(floor, price));
}

/** The active event bending this item's market right now, if any. */
export function activeEvent(state: WorldState, itemId: ItemId): WorldEvent | undefined {
  if (!state.events) return undefined;
  for (const e of state.events) {
    if (e.itemId === itemId && e.startTick <= state.tick && e.endTick > state.tick) return e;
  }
  return undefined;
}

// All balance numbers live here so tuning passes touch one object.
export const TUNING = {
  producer: { cadence: 6, batch: 2, inventoryCap: 80, glutThreshold: 50, margin: 1.05 },
  consumer: { cadence: 5, wageFactor: 0.75, buffer: 3 },
  marketMaker: { cadence: 8, spreadPct: 0.06, quoteQty: 4 },
  momentum: { cadence: 7, band: 0.02 },
  noise: { cadence: 4, cancelChance: 0.15 },
  npc: { bailoutFloor: 0.2, bailoutCooldownTicks: 500 },
  /** Seeded market shocks — the drama generator. */
  events: { checkEvery: 250, chance: 0.35, minDuration: 800, maxDuration: 2000 },
  /** Quartermaster contracts — goal-directed premium buy-orders. */
  contracts: {
    checkEvery: 400,
    chance: 0.5,
    maxOpen: 3,
    minDuration: 1500,
    maxDuration: 3000,
    premiumMin: 1.15,
    premiumMax: 1.35,
    targetGp: 8_000,
  },
  player: {
    cadence: 5,
    maxQty: 8,
    capitalFraction: 0.25,
    minProfit: 2,
    minMarginPct: 0.03,
    maxConcurrentFlips: 2,
    staleHoldTicks: 200,
  },
  /** Engine-side idle automation: autoFlip tier N reads index N-1.
   * NOTE: idle players never buy slots (3 forever), so maxFlips must leave
   * sell capacity — 3 concurrent flips jams all slots and forces stale-dump
   * losses (measured: seed 99 isolated −4,306). Tier 3's perk is speed. */
  automation: {
    autoFlip: [
      // maxVolatility: junior clerks only trade stable goods — volatile books
      // are where automation bleeds (adverse selection on wide % spreads).
      // Re-swept whenever the world's RNG path changes (catalog growth, new
      // spawners) — sweep BOTH scenario legs (FINDINGS #34). Current locks
      // are for the 84-item catalog; per-tier numbers in the comments below.
      // Do NOT raise any clerk vol ceiling to 0.13+: that admits the
      // exotics, whose wide gp corridors print 130k+/8k ticks (FINDINGS #33).
      // Tier 1 (120 items): cad 6 / vol 0.10 — min +1,603, medians
      // 2,646/3,381; cad 7/0.10 hides a -10,943 isolated-seed-1337 hole
      // (stale dumps on the 80-deep staple track's pricier items).
      { cadence: 6, maxFlips: 1, maxQty: 6, capitalFraction: 0.25, maxVolatility: 0.1 },
      // Tier 2 (120 items): cad 7 / vol 0.12 — min +1,617, medians
      // 2,837/6,266. NOTE: vol 0.10 and 0.12 measured IDENTICAL here (no
      // items in that vol band on this catalog); 0.12 kept for identity.
      // cad 8 hides a -10,215 competitive-seed-7 hole.
      { cadence: 7, maxFlips: 2, maxQty: 8, capitalFraction: 0.25, maxVolatility: 0.12 },
      // Tier 3 vol ceiling is 0.12, NOT 1: exotics are HUMAN territory —
      // same design rule as events (FINDINGS #27/#33). Tier 3 = speed +
      // size. 120-item re-verify: min +5,187, medians 6,233/7,203.
      { cadence: 4, maxFlips: 2, maxQty: 10, capitalFraction: 0.35, maxVolatility: 0.12 },
    ],
  },
} as const;

const CADENCE: Record<AgentKind, number> = {
  producer: TUNING.producer.cadence,
  consumer: TUNING.consumer.cadence,
  marketMaker: TUNING.marketMaker.cadence,
  momentum: TUNING.momentum.cadence,
  noise: TUNING.noise.cadence,
  player: TUNING.player.cadence,
};

export function actAgent(state: WorldState, agent: AgentState, rng: RNG): void {
  if (agent.kind === 'player') {
    // Idle players run engine-side automation on the tier's own cadence;
    // scripted players (the active-play stand-in) act on the base cadence.
    if (agent.policy === 'idle') return actIdlePlayer(state, agent);
    if ((state.tick + agent.id) % TUNING.player.cadence !== 0) return;
    return actPlayer(state, agent);
  }
  if ((state.tick + agent.id) % CADENCE[agent.kind] !== 0) return;
  switch (agent.kind) {
    case 'producer':
      return actProducer(state, agent);
    case 'consumer':
      return actConsumer(state, agent);
    case 'marketMaker':
      return actMarketMaker(state, agent);
    case 'momentum':
      return actMomentum(state, agent, rng);
    case 'noise':
      return actNoise(state, agent, rng);
  }
}

function defFor(state: WorldState, itemId: ItemId | undefined): ItemDef {
  const def = itemDef(state, itemId);
  if (!def) throw new Error(`agent specialised in unknown item ${itemId}`);
  return def;
}

/** Mints items at cost-anchored rate; sells at or above cost — the price floor. */
function actProducer(state: WorldState, agent: AgentState): void {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  const ev = activeEvent(state, def.id);
  let batch: number = TUNING.producer.batch;
  if (ev?.kind === 'supply_shock') batch = 0; // strike/blight — production halts
  if (ev?.kind === 'supply_glut') batch = TUNING.producer.batch * 2;
  const held = agent.inventory[def.id] ?? 0;
  const make = Math.min(batch, Math.max(0, TUNING.producer.inventoryCap - held));
  if (make > 0) {
    // Production consumes gp at cost (raw materials leave the economy — the
    // sink that tames producer hoarding). Broke producers still work, so the
    // economy can bootstrap from zero.
    const cost = def.baseCost * make;
    if (agent.gp >= cost) {
      agent.gp -= cost;
      state.ledger.gpBurned += cost;
    }
    agent.inventory[def.id] = held + make;
    state.ledger.itemsMinted[def.id] = (state.ledger.itemsMinted[def.id] ?? 0) + make;
  }
  cancelAgentOrders(state, agent, def.id);
  const stock = agent.inventory[def.id] ?? 0;
  if (stock < 1) return;
  const floor = Math.max(1, Math.round(def.baseCost * TUNING.producer.margin));
  const ask = bestAsk(book);
  let price: number;
  if (stock > TUNING.producer.glutThreshold) {
    price = floor; // glut: dump at cost to clear
  } else if (ask) {
    price = Math.max(floor, ask.price - 1); // undercut, never below cost
  } else {
    price = Math.max(floor, Math.round(book.lastPrice * 1.02));
  }
  placeOrder(state, agent, def.id, 'sell', price, stock);
}

/** Earns a wage (gp faucet), burns items (item sink), bids up to reservation value — the price ceiling. */
function actConsumer(state: WorldState, agent: AgentState): void {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  const ev = activeEvent(state, def.id);
  const surge = ev?.kind === 'demand_surge';
  const wage = Math.ceil(def.consumeValue * TUNING.consumer.wageFactor * (surge ? 1.5 : 1));
  agent.gp += wage;
  state.ledger.gpMinted += wage;
  if (ev?.kind === 'demand_slump') return; // nobody's buying — wage piles up
  const held = agent.inventory[def.id] ?? 0;
  if (held > 0) {
    agent.inventory[def.id] = held - 1;
    state.ledger.itemsBurned[def.id] = (state.ledger.itemsBurned[def.id] ?? 0) + 1;
  }
  const buffer = TUNING.consumer.buffer + (surge ? 2 : 0);
  if ((agent.inventory[def.id] ?? 0) >= buffer) return;
  cancelAgentOrders(state, agent, def.id);
  const ask = bestAsk(book);
  const target = ask ? ask.price : Math.round(book.lastPrice);
  const price = Math.max(1, Math.min(def.consumeValue, target));
  const want = buffer - (agent.inventory[def.id] ?? 0);
  const qty = Math.min(want, Math.floor(agent.gp / price));
  if (qty >= 1) placeOrder(state, agent, def.id, 'buy', price, qty);
}

/** Quotes both sides around the EMA — provides the liquidity the flipper trades against. */
function actMarketMaker(state: WorldState, agent: AgentState): void {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  cancelAgentOrders(state, agent, def.id);
  const mid = Math.max(2, Math.round(book.ema));
  const spread = Math.max(4, Math.round(mid * TUNING.marketMaker.spreadPct));
  const half = Math.floor(spread / 2);
  // Bargain-hunter floor: never bid below 60% of production cost. This is the
  // hard bottom for event-driven crashes — without it, a demand slump removes
  // the value anchor and speculators walk prices into a death spiral.
  const bidFloor = Math.max(1, Math.round(def.baseCost * 0.6));
  const bidPrice = Math.max(bidFloor, mid - half);
  const askPrice = Math.max(bidPrice + 1, Math.min(Math.round(def.consumeValue * 1.25), mid + (spread - half)));
  const buyQty = Math.min(TUNING.marketMaker.quoteQty, Math.floor(agent.gp / bidPrice));
  if (buyQty >= 1) placeOrder(state, agent, def.id, 'buy', bidPrice, buyQty);
  const sellQty = Math.min(TUNING.marketMaker.quoteQty, agent.inventory[def.id] ?? 0);
  if (sellQty >= 1) placeOrder(state, agent, def.id, 'sell', askPrice, sellQty);
}

/**
 * Speculators bleed out over long runs (tax + bad trades). When one is nearly
 * broke, "a new trader enters the market": top gp back to starting bankroll,
 * minted explicitly through the ledger. Cooldown stops hopeless cases from
 * becoming a per-act faucet.
 */
function maybeBailout(state: WorldState, agent: AgentState): void {
  const start = agent.memo['startGp'] ?? 0;
  if (start <= 0 || agent.gp >= start * TUNING.npc.bailoutFloor) return;
  const last = agent.memo['lastBailout'];
  if (last !== undefined && state.tick - last < TUNING.npc.bailoutCooldownTicks) return;
  const topUp = start - agent.gp;
  agent.gp = start;
  state.ledger.gpMinted += topUp;
  state.stats.npcBailouts++;
  agent.memo['lastBailout'] = state.tick;
}

/** Chases trends — buys strength, sells weakness. The boom/bust pressure source. */
function actMomentum(state: WorldState, agent: AgentState, rng: RNG): void {
  maybeBailout(state, agent);
  if (rng.chance(0.1)) cancelAgentOrders(state, agent);
  const def = rng.pick(state.items);
  const book = state.books[def.id];
  if (!book) return;
  const rising = book.lastPrice > book.ema * (1 + TUNING.momentum.band);
  const falling = book.lastPrice < book.ema * (1 - TUNING.momentum.band);
  if (rising) {
    const ask = bestAsk(book);
    const price = ask ? ask.price : Math.max(1, Math.round(book.lastPrice * 1.03));
    if (price > saneClamp(def, price)) return; // won't chase a bubble past sanity
    const qty = Math.min(rng.int(1, 2), Math.floor(agent.gp / price));
    if (qty >= 1) placeOrder(state, agent, def.id, 'buy', price, qty);
  } else if (falling) {
    const held = agent.inventory[def.id] ?? 0;
    if (held > 0) {
      const bid = bestBid(book);
      const raw = bid ? bid.price : Math.max(1, Math.round(book.lastPrice * 0.97));
      const price = Math.max(raw, Math.max(1, Math.round(def.baseCost * 0.55)));
      placeOrder(state, agent, def.id, 'sell', price, Math.min(held, rng.int(1, 2)));
    }
  }
}

/** Random walk around last price — keeps books from going sterile. */
function actNoise(state: WorldState, agent: AgentState, rng: RNG): void {
  maybeBailout(state, agent);
  if (rng.chance(TUNING.noise.cancelChance)) cancelAgentOrders(state, agent);
  const def = rng.pick(state.items);
  const book = state.books[def.id];
  if (!book) return;
  const perturb = 1 + (rng.next() * 2 - 1) * def.volatility;
  const price = saneClamp(def, Math.round(book.lastPrice * perturb));
  if (rng.chance(0.5)) {
    const qty = Math.min(rng.int(1, 3), Math.floor(agent.gp / price));
    if (qty >= 1) placeOrder(state, agent, def.id, 'buy', price, qty);
  } else {
    const qty = Math.min(rng.int(1, 3), agent.inventory[def.id] ?? 0);
    if (qty >= 1) placeOrder(state, agent, def.id, 'sell', price, qty);
  }
}

/** The active player stand-in: full flipper with slot management. */
function actPlayer(state: WorldState, agent: AgentState): void {
  runFlipper(state, agent, {
    maxFlips: TUNING.player.maxConcurrentFlips,
    maxQty: TUNING.player.maxQty,
    capitalFraction: TUNING.player.capitalFraction,
    manageSlots: true,
    maxVolatility: 1, // the active player takes whatever risk it likes
    focusItemId: null,
    staleHoldTicks: TUNING.player.staleHoldTicks,
  });
}

/** Purchased engine-side automation — this is what "idle game" means here. */
function actIdlePlayer(state: WorldState, agent: AgentState): void {
  const tier = agent.upgrades?.['autoFlip'] ?? 0;
  if (tier < 1) return;
  const conf = TUNING.automation.autoFlip[Math.min(tier, TUNING.automation.autoFlip.length) - 1];
  if (!conf) return;
  if ((state.tick + agent.id) % conf.cadence !== 0) return;
  // Clerk Orders: config can only make automation MORE conservative than its
  // tier (vol is min'd with the tier ceiling; capital fraction is clamped).
  const cfg = agent.botConfig;
  runFlipper(state, agent, {
    maxFlips: conf.maxFlips,
    maxQty: conf.maxQty,
    capitalFraction: Math.min(0.5, Math.max(0.1, cfg?.capitalFraction ?? conf.capitalFraction)),
    manageSlots: false, // automation never spends on unlocks — purchases are deliberate
    maxVolatility: Math.min(conf.maxVolatility, cfg?.maxVolatility ?? conf.maxVolatility),
    focusItemId: cfg?.focusItemId ?? null,
    staleHoldTicks: TUNING.player.staleHoldTicks,
  });
}

interface FlipperOpts {
  maxFlips: number;
  maxQty: number;
  capitalFraction: number;
  manageSlots: boolean;
  /** Skip items more volatile than this (1 = trade everything). */
  maxVolatility: number;
  /** Clerk Orders: only open new flips on this item (null = any). */
  focusItemId: ItemId | null;
  /** Ticks before a losing position dumps at market. The anchored economy
   * mean-reverts, so patience converts dumps back into break-even exits. */
  staleHoldTicks: number;
}

/**
 * The flipper strategy core — shared by the scripted player and idle
 * automation. Drives the engine EXCLUSIVELY through the player command
 * protocol (applyCommand/playerView) — the same surface bots, UI, and server
 * use. Classic GE flip: buy at bid+1, sell at ask-1, only when post-tax
 * margin clears.
 */
function runFlipper(state: WorldState, agent: AgentState, opts: FlipperOpts): void {
  const first = playerView(state, agent.id);
  if (!first) return;
  // Buy the next offer slot once capital comfortably covers it.
  if (opts.manageSlots && first.nextSlotCost !== null && first.gp > first.nextSlotCost * 4) {
    applyCommand(state, agent.id, { type: 'buySlot' });
  }

  applyCommand(state, agent.id, { type: 'cancel', side: 'buy' });

  // Position bookkeeping (bot-local memory in memo, not engine state), AFTER
  // the buy-cancel so "open" reflects reality: clear cost basis once an item
  // is fully exited — no inventory, no escrowed sells, no pending buys.
  // Otherwise stamp when the position opened.
  const booked = playerView(state, agent.id);
  if (!booked) return;
  for (const def of state.items) {
    const held = booked.inventory[def.id] ?? 0;
    const open = booked.openOrders.some((o) => o.itemId === def.id);
    if (held === 0 && !open) {
      delete agent.memo[`basis_${def.id}`];
      delete agent.memo[`since_${def.id}`];
    } else if (agent.memo[`since_${def.id}`] === undefined) {
      agent.memo[`since_${def.id}`] = state.tick;
    }
  }

  // Re-quote sells. Only cancel an existing listing when we can re-list it
  // (cancelling frees our own slot, so re-listing is always possible then).
  // Fresh positions never list below post-tax break-even; stale positions
  // (held too long) take the market price and cut the loss.
  // PERF: playerView is a pure function of state, so it is rebuilt ONLY
  // after a mutation (cancel/place). Most items mutate nothing, so this
  // turns ~2×items full-book scans per act into a handful — measured 66%
  // of all sim self-time before the fix. Decisions are output-identical
  // (hash-equality proven on seeds 7/42/1337 × 8k ticks).
  let v = playerView(state, agent.id);
  if (!v) return;
  let dirty = false;
  for (const def of state.items) {
    if (dirty) {
      v = playerView(state, agent.id);
      if (!v) return;
      dirty = false;
    }
    const mySells = v.openOrders.filter((o) => o.itemId === def.id && o.side === 'sell').length;
    if (mySells === 0 && v.openOrders.length >= v.slots) continue; // no free slot to list into
    if (mySells > 0) {
      applyCommand(state, agent.id, { type: 'cancel', itemId: def.id, side: 'sell' });
      v = playerView(state, agent.id);
      if (!v) return;
    }
    const held = v.inventory[def.id] ?? 0;
    if (held < 1) continue;
    const m = v.markets.find((x) => x.itemId === def.id);
    if (!m) continue;
    let sellAt = Math.max(1, m.bestAsk !== null ? m.bestAsk - 1 : Math.round(m.ema * 1.03));
    const basis = agent.memo[`basis_${def.id}`];
    const since = agent.memo[`since_${def.id}`];
    const stale = since !== undefined && state.tick - since > opts.staleHoldTicks;
    if (basis !== undefined && !stale) {
      sellAt = Math.max(sellAt, Math.ceil((basis + 1) / (1 - GE_TAX_RATE)));
    }
    applyCommand(state, agent.id, { type: 'place', itemId: def.id, side: 'sell', price: sellAt, qty: held });
    dirty = true;
  }

  // Hunt flips — up to maxConcurrentFlips across distinct items, while slots
  // and capital allow. Rank by margin PERCENTAGE, not absolute gp: absolute
  // ranking chases high-ticket illiquid spreads whose stale-dump losses scale
  // with item price (measured: −16k over 6k ticks on the 14-item catalog).
  // Ties keep catalog order via stable sort — cheapest, most liquid first.
  let vBuy = dirty ? playerView(state, agent.id) : v;
  if (!vBuy) return;
  const candidates: { itemId: ItemId; buyAt: number; profit: number; pct: number; bidDepth: number }[] = [];
  for (const m of vBuy.markets) {
    if (m.bestBid === null || m.bestAsk === null) continue;
    if (m.bestAskIsMine) continue; // our own sell is best ask — no flip here
    if (opts.focusItemId !== null && m.itemId !== opts.focusItemId) continue;
    const def = itemDef(state, m.itemId);
    if (!def || def.volatility > opts.maxVolatility) continue;
    // Read the news: never open a flip on an item with ANY active event.
    // Falling events crash into you; rising events mean-revert the moment the
    // event ends. Event markets are for the human to play, not the clerk.
    if (activeEvent(state, m.itemId)) continue;
    const buyAt = m.bestBid + 1;
    const sellAt = m.bestAsk - 1;
    if (sellAt <= buyAt) continue;
    const profit = sellAt - Math.floor(sellAt * GE_TAX_RATE) - buyAt;
    // Skip flips that barely clear tax — thin margins lose to price drift.
    const minProfit = Math.max(TUNING.player.minProfit, Math.ceil(buyAt * TUNING.player.minMarginPct));
    if (profit >= minProfit) {
      candidates.push({ itemId: m.itemId, buyAt, profit, pct: profit / buyAt, bidDepth: m.bidDepth });
    }
  }
  candidates.sort((a, b) => b.pct - a.pct);
  let placed = 0;
  for (const c of candidates) {
    if (placed >= opts.maxFlips) break;
    vBuy = playerView(state, agent.id);
    if (!vBuy) return;
    if (vBuy.openOrders.length >= vBuy.slots) break;
    const budget = Math.floor(vBuy.gp * opts.capitalFraction);
    // Never hold more than the bid side can absorb — a stale dump into a
    // thin book realizes losses that scale with position size (measured:
    // −12.4k in one event from 5 prayer potions vs a ~5-deep bid book).
    const exitCap = Math.max(1, Math.floor(c.bidDepth / 2));
    const qty = Math.min(opts.maxQty, Math.floor(budget / c.buyAt), exitCap);
    if (qty < 1) continue;
    const r = applyCommand(state, agent.id, { type: 'place', itemId: c.itemId, side: 'buy', price: c.buyAt, qty });
    if (r.ok) {
      const prevBasis = agent.memo[`basis_${c.itemId}`];
      if (prevBasis === undefined) {
        agent.memo[`basis_${c.itemId}`] = c.buyAt;
      } else {
        // Topping up an existing position: blend to weighted-average cost
        // over the current position size (held + escrowed + pending).
        const pos =
          (vBuy.inventory[c.itemId] ?? 0) +
          vBuy.openOrders.filter((o) => o.itemId === c.itemId).reduce((a, o) => a + o.remaining, 0);
        agent.memo[`basis_${c.itemId}`] =
          pos > 0 ? Math.round((prevBasis * pos + c.buyAt * qty) / (pos + qty)) : c.buyAt;
      }
      if (agent.memo[`since_${c.itemId}`] === undefined) agent.memo[`since_${c.itemId}`] = state.tick;
      placed++;
    }
  }
}
