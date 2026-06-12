// packages/engine/src/exchange.ts
var GE_TAX_RATE = 0.02;
var EMA_ALPHA = 0.05;
var TRADE_WINDOW = 512;
function createBook(itemId, initialPrice) {
  return { itemId, buys: [], sells: [], lastPrice: initialPrice, ema: initialPrice, volume: 0 };
}
function bestBid(book) {
  return book.buys[0];
}
function bestAsk(book) {
  return book.sells[0];
}
var MAX_RESTING_PER_AGENT_BOOK = 16;
function buyBefore(a, b) {
  if (a.price !== b.price) return a.price > b.price;
  if (a.tick !== b.tick) return a.tick < b.tick;
  return a.id < b.id;
}
function sellBefore(a, b) {
  if (a.price !== b.price) return a.price < b.price;
  if (a.tick !== b.tick) return a.tick < b.tick;
  return a.id < b.id;
}
function insertSorted(arr, order, before) {
  let i = 0;
  while (i < arr.length && !before(order, arr[i])) i++;
  arr.splice(i, 0, order);
}
function agentById(state, id) {
  const a = state.agents[id];
  if (!a || a.id !== id) throw new Error(`agent id/index mismatch for ${id}`);
  return a;
}
function recordTrade(state, book, price, qty, buyerId, sellerId) {
  book.lastPrice = price;
  book.ema = book.ema + EMA_ALPHA * (price - book.ema);
  book.volume += qty;
  const trade = { tick: state.tick, itemId: book.itemId, price, qty, buyerId, sellerId };
  state.trades.push(trade);
  if (state.trades.length > TRADE_WINDOW) state.trades.shift();
  state.stats.tradesTotal++;
  return trade;
}
function paySeller(state, seller, proceeds) {
  const tax = Math.floor(proceeds * GE_TAX_RATE);
  seller.gp += proceeds - tax;
  state.ledger.gpBurned += tax;
}
function rejected(state, reason) {
  state.stats.ordersRejected++;
  return { accepted: false, reason, trades: [] };
}
function placeOrder(state, agent, itemId, side, price, qty) {
  const book = state.books[itemId];
  if (!book) return rejected(state, "unknown-item");
  if (!Number.isInteger(price) || price < 1) return rejected(state, "bad-price");
  if (!Number.isInteger(qty) || qty < 1) return rejected(state, "bad-qty");
  if (side === "buy" && agent.gp < price * qty) return rejected(state, "insufficient-gp");
  if (side === "sell" && (agent.inventory[itemId] ?? 0) < qty) return rejected(state, "insufficient-items");
  let resting = 0;
  for (const o of book.buys) if (o.agentId === agent.id) resting++;
  for (const o of book.sells) if (o.agentId === agent.id) resting++;
  if (resting >= MAX_RESTING_PER_AGENT_BOOK) return rejected(state, "book-cap");
  state.stats.ordersPlaced++;
  const order = {
    id: state.nextOrderId++,
    tick: state.tick,
    agentId: agent.id,
    itemId,
    side,
    price,
    qty,
    remaining: qty,
    escrowGp: 0
  };
  const trades = [];
  if (side === "buy") {
    let i = 0;
    while (order.remaining > 0 && i < book.sells.length) {
      const ask = book.sells[i];
      if (ask.price > price) break;
      if (ask.agentId === agent.id) {
        i++;
        continue;
      }
      const q = Math.min(order.remaining, ask.remaining);
      const tradePrice = ask.price;
      agent.gp -= tradePrice * q;
      agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) + q;
      paySeller(state, agentById(state, ask.agentId), tradePrice * q);
      ask.remaining -= q;
      order.remaining -= q;
      trades.push(recordTrade(state, book, tradePrice, q, agent.id, ask.agentId));
      if (ask.remaining === 0) book.sells.splice(i, 1);
    }
    if (order.remaining > 0) {
      order.escrowGp = price * order.remaining;
      agent.gp -= order.escrowGp;
      insertSorted(book.buys, order, buyBefore);
    }
  } else {
    agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) - qty;
    let i = 0;
    while (order.remaining > 0 && i < book.buys.length) {
      const bid = book.buys[i];
      if (bid.price < price) break;
      if (bid.agentId === agent.id) {
        i++;
        continue;
      }
      const q = Math.min(order.remaining, bid.remaining);
      const tradePrice = bid.price;
      bid.escrowGp -= tradePrice * q;
      const buyer = agentById(state, bid.agentId);
      buyer.inventory[itemId] = (buyer.inventory[itemId] ?? 0) + q;
      paySeller(state, agent, tradePrice * q);
      bid.remaining -= q;
      order.remaining -= q;
      trades.push(recordTrade(state, book, tradePrice, q, bid.agentId, agent.id));
      if (bid.remaining === 0) book.buys.splice(i, 1);
    }
    if (order.remaining > 0) {
      insertSorted(book.sells, order, sellBefore);
    }
  }
  return { accepted: true, trades };
}
function cancelAgentOrders(state, agent, itemId, side) {
  let n = 0;
  for (const def of state.items) {
    if (itemId !== void 0 && def.id !== itemId) continue;
    const book = state.books[def.id];
    if (!book) continue;
    if (side === void 0 || side === "buy") {
      n += cancelFromSide(book.buys, agent, (o) => {
        agent.gp += o.escrowGp;
        o.escrowGp = 0;
      });
    }
    if (side === void 0 || side === "sell") {
      n += cancelFromSide(book.sells, agent, (o) => {
        agent.inventory[o.itemId] = (agent.inventory[o.itemId] ?? 0) + o.remaining;
      });
    }
  }
  state.stats.ordersCancelled += n;
  return n;
}
function cancelFromSide(sideArr, agent, refund) {
  let n = 0;
  for (let i = sideArr.length - 1; i >= 0; i--) {
    const o = sideArr[i];
    if (o.agentId !== agent.id) continue;
    refund(o);
    sideArr.splice(i, 1);
    n++;
  }
  return n;
}

// packages/engine/src/items.ts
var ITEM_INDEX = /* @__PURE__ */ new WeakMap();
function itemDef(state, itemId) {
  if (itemId === void 0) return void 0;
  let index = ITEM_INDEX.get(state.items);
  if (!index) {
    index = new Map(state.items.map((i) => [i.id, i]));
    ITEM_INDEX.set(state.items, index);
  }
  return index.get(itemId);
}

// packages/engine/src/agents.ts
function saneClamp(def, price) {
  const floor = Math.max(1, Math.round(def.baseCost * 0.55));
  const ceil = Math.round(def.consumeValue * 1.25);
  return Math.min(ceil, Math.max(floor, price));
}
function activeEvent(state, itemId) {
  if (!state.events) return void 0;
  for (const e of state.events) {
    if (e.itemId === itemId && e.startTick <= state.tick && e.endTick > state.tick) return e;
  }
  return void 0;
}
var TUNING = {
  producer: { cadence: 6, batch: 2, inventoryCap: 80, glutThreshold: 50, margin: 1.05 },
  consumer: { cadence: 5, wageFactor: 0.75, buffer: 3 },
  marketMaker: { cadence: 8, spreadPct: 0.06, quoteQty: 4 },
  momentum: { cadence: 7, band: 0.02 },
  noise: { cadence: 4, cancelChance: 0.15 },
  npc: { bailoutFloor: 0.2, bailoutCooldownTicks: 500 },
  /** Seeded market shocks — the drama generator. */
  events: { checkEvery: 250, chance: 0.35, minDuration: 800, maxDuration: 2e3 },
  /** Quartermaster contracts — goal-directed premium buy-orders. */
  contracts: {
    checkEvery: 400,
    chance: 0.5,
    maxOpen: 3,
    minDuration: 1500,
    maxDuration: 3e3,
    premiumMin: 1.15,
    premiumMax: 1.35,
    targetGp: 8e3
  },
  player: {
    cadence: 5,
    maxQty: 8,
    capitalFraction: 0.25,
    minProfit: 2,
    minMarginPct: 0.03,
    maxConcurrentFlips: 2,
    staleHoldTicks: 200
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
      // Tier 1 (120 items, staple vol ladder): cad 6 / vol 0.10 — min +766,
      // medians 1,757/2,297. The ladder (genCatalog) keeps ≥5k-gp staples
      // at vol 0.12, OUT of tier 1's universe — that's where the -10k
      // stale-dump holes lived (FINDINGS #40/#41).
      { cadence: 6, maxFlips: 1, maxQty: 6, capitalFraction: 0.25, maxVolatility: 0.1 },
      // Tier 2 (120 items, staple vol ladder): cad 7 / vol 0.12 — min
      // +2,499, medians 8,032/9,586. The 0.12 ceiling is REAL again: the
      // ≥5k-gp staples are tier-2/3's exclusive hunting ground now.
      { cadence: 7, maxFlips: 2, maxQty: 8, capitalFraction: 0.25, maxVolatility: 0.12 },
      // Tier 3 vol ceiling is 0.12, NOT 1: exotics are HUMAN territory —
      // same design rule as events (FINDINGS #27/#33). Tier 3 = speed +
      // size. Ladder sweep: cad 5 min +6,665, medians 9,250/8,342 (cad 4's
      // min collapsed to +2,000 — too fast for the pricier 0.12 books).
      { cadence: 5, maxFlips: 2, maxQty: 10, capitalFraction: 0.35, maxVolatility: 0.12 }
    ]
  },
  /** The Sellsword (9h): engine-side expedition autopilot. One action every
   * `cadence` ticks; never past `maxRegion` (no fire country — it carries no
   * potion); embarks empty-handed when rested past `embarkHp`, retreats and
   * extracts below `retreatHp`; flees elites/dragonfire/leeches and anything
   * with atk ≥ `fleeAtk`. Conservative BY DESIGN — it levels and trickles
   * loot; the deep runs stay yours. */
  sellsword: { cadence: 4, maxRegion: 4, embarkHp: 35, retreatHp: 12, fleeAtk: 11 }
};
var CADENCE = {
  producer: TUNING.producer.cadence,
  consumer: TUNING.consumer.cadence,
  marketMaker: TUNING.marketMaker.cadence,
  momentum: TUNING.momentum.cadence,
  noise: TUNING.noise.cadence,
  player: TUNING.player.cadence
};
function actAgent(state, agent, rng) {
  if (agent.kind === "player") {
    if (agent.policy === "idle") return actIdlePlayer(state, agent);
    if ((state.tick + agent.id) % TUNING.player.cadence !== 0) return;
    return actPlayer(state, agent);
  }
  if ((state.tick + agent.id) % CADENCE[agent.kind] !== 0) return;
  switch (agent.kind) {
    case "producer":
      return actProducer(state, agent);
    case "consumer":
      return actConsumer(state, agent);
    case "marketMaker":
      return actMarketMaker(state, agent);
    case "momentum":
      return actMomentum(state, agent, rng);
    case "noise":
      return actNoise(state, agent, rng);
  }
}
function defFor(state, itemId) {
  const def = itemDef(state, itemId);
  if (!def) throw new Error(`agent specialised in unknown item ${itemId}`);
  return def;
}
function actProducer(state, agent) {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  const ev = activeEvent(state, def.id);
  let batch = TUNING.producer.batch;
  if (ev?.kind === "supply_shock") batch = 0;
  if (ev?.kind === "supply_glut") batch = TUNING.producer.batch * 2;
  const held = agent.inventory[def.id] ?? 0;
  const make = Math.min(batch, Math.max(0, TUNING.producer.inventoryCap - held));
  if (make > 0) {
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
  let price;
  if (stock > TUNING.producer.glutThreshold) {
    price = floor;
  } else if (ask) {
    price = Math.max(floor, ask.price - 1);
  } else {
    price = Math.max(floor, Math.round(book.lastPrice * 1.02));
  }
  placeOrder(state, agent, def.id, "sell", price, stock);
}
function actConsumer(state, agent) {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  const ev = activeEvent(state, def.id);
  const surge = ev?.kind === "demand_surge";
  const wage = Math.ceil(def.consumeValue * TUNING.consumer.wageFactor * (surge ? 1.5 : 1));
  agent.gp += wage;
  state.ledger.gpMinted += wage;
  if (ev?.kind === "demand_slump") return;
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
  if (qty >= 1) placeOrder(state, agent, def.id, "buy", price, qty);
}
function actMarketMaker(state, agent) {
  const def = defFor(state, agent.itemId);
  const book = state.books[def.id];
  if (!book) return;
  cancelAgentOrders(state, agent, def.id);
  const mid = Math.max(2, Math.round(book.ema));
  const spread = Math.max(4, Math.round(mid * TUNING.marketMaker.spreadPct));
  const half = Math.floor(spread / 2);
  const bidFloor = Math.max(1, Math.round(def.baseCost * 0.6));
  const bidPrice = Math.max(bidFloor, mid - half);
  const askPrice = Math.max(bidPrice + 1, Math.min(Math.round(def.consumeValue * 1.25), mid + (spread - half)));
  const buyQty = Math.min(TUNING.marketMaker.quoteQty, Math.floor(agent.gp / bidPrice));
  if (buyQty >= 1) placeOrder(state, agent, def.id, "buy", bidPrice, buyQty);
  const sellQty = Math.min(TUNING.marketMaker.quoteQty, agent.inventory[def.id] ?? 0);
  if (sellQty >= 1) placeOrder(state, agent, def.id, "sell", askPrice, sellQty);
}
function maybeBailout(state, agent) {
  const start = agent.memo["startGp"] ?? 0;
  if (start <= 0 || agent.gp >= start * TUNING.npc.bailoutFloor) return;
  const last = agent.memo["lastBailout"];
  if (last !== void 0 && state.tick - last < TUNING.npc.bailoutCooldownTicks) return;
  const topUp = start - agent.gp;
  agent.gp = start;
  state.ledger.gpMinted += topUp;
  state.stats.npcBailouts++;
  agent.memo["lastBailout"] = state.tick;
}
function actMomentum(state, agent, rng) {
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
    if (price > saneClamp(def, price)) return;
    const qty = Math.min(rng.int(1, 2), Math.floor(agent.gp / price));
    if (qty >= 1) placeOrder(state, agent, def.id, "buy", price, qty);
  } else if (falling) {
    const held = agent.inventory[def.id] ?? 0;
    if (held > 0) {
      const bid = bestBid(book);
      const raw = bid ? bid.price : Math.max(1, Math.round(book.lastPrice * 0.97));
      const price = Math.max(raw, Math.max(1, Math.round(def.baseCost * 0.55)));
      placeOrder(state, agent, def.id, "sell", price, Math.min(held, rng.int(1, 2)));
    }
  }
}
function actNoise(state, agent, rng) {
  maybeBailout(state, agent);
  if (rng.chance(TUNING.noise.cancelChance)) cancelAgentOrders(state, agent);
  const def = rng.pick(state.items);
  const book = state.books[def.id];
  if (!book) return;
  const perturb = 1 + (rng.next() * 2 - 1) * def.volatility;
  const price = saneClamp(def, Math.round(book.lastPrice * perturb));
  if (rng.chance(0.5)) {
    const qty = Math.min(rng.int(1, 3), Math.floor(agent.gp / price));
    if (qty >= 1) placeOrder(state, agent, def.id, "buy", price, qty);
  } else {
    const qty = Math.min(rng.int(1, 3), agent.inventory[def.id] ?? 0);
    if (qty >= 1) placeOrder(state, agent, def.id, "sell", price, qty);
  }
}
function actPlayer(state, agent) {
  runFlipper(state, agent, {
    maxFlips: TUNING.player.maxConcurrentFlips,
    maxQty: TUNING.player.maxQty,
    capitalFraction: TUNING.player.capitalFraction,
    manageSlots: true,
    maxVolatility: 1,
    // the active player takes whatever risk it likes
    focusItemId: null,
    staleHoldTicks: TUNING.player.staleHoldTicks
  });
}
function actIdlePlayer(state, agent) {
  const tier = agent.upgrades?.["autoFlip"] ?? 0;
  if (tier < 1) return;
  const conf = TUNING.automation.autoFlip[Math.min(tier, TUNING.automation.autoFlip.length) - 1];
  if (!conf) return;
  if ((state.tick + agent.id) % conf.cadence !== 0) return;
  const cfg = agent.botConfig;
  runFlipper(state, agent, {
    maxFlips: conf.maxFlips,
    maxQty: conf.maxQty,
    capitalFraction: Math.min(0.5, Math.max(0.1, cfg?.capitalFraction ?? conf.capitalFraction)),
    manageSlots: false,
    // automation never spends on unlocks — purchases are deliberate
    maxVolatility: Math.min(conf.maxVolatility, cfg?.maxVolatility ?? conf.maxVolatility),
    focusItemId: cfg?.focusItemId ?? null,
    staleHoldTicks: TUNING.player.staleHoldTicks
  });
}
function runFlipper(state, agent, opts) {
  const first = playerView(state, agent.id);
  if (!first) return;
  if (opts.manageSlots && first.nextSlotCost !== null && first.gp > first.nextSlotCost * 4) {
    applyCommand(state, agent.id, { type: "buySlot" });
  }
  applyCommand(state, agent.id, { type: "cancel", side: "buy" });
  const booked = playerView(state, agent.id);
  if (!booked) return;
  for (const def of state.items) {
    const held = booked.inventory[def.id] ?? 0;
    const open = booked.openOrders.some((o) => o.itemId === def.id);
    if (held === 0 && !open) {
      delete agent.memo[`basis_${def.id}`];
      delete agent.memo[`since_${def.id}`];
    } else if (agent.memo[`since_${def.id}`] === void 0) {
      agent.memo[`since_${def.id}`] = state.tick;
    }
  }
  let v = playerView(state, agent.id);
  if (!v) return;
  let dirty = false;
  for (const def of state.items) {
    if (dirty) {
      v = playerView(state, agent.id);
      if (!v) return;
      dirty = false;
    }
    const mySells = v.openOrders.filter((o) => o.itemId === def.id && o.side === "sell").length;
    if (mySells === 0 && v.openOrders.length >= v.slots) continue;
    if (mySells > 0) {
      applyCommand(state, agent.id, { type: "cancel", itemId: def.id, side: "sell" });
      v = playerView(state, agent.id);
      if (!v) return;
    }
    const held = v.inventory[def.id] ?? 0;
    if (held < 1) continue;
    const basis = agent.memo[`basis_${def.id}`];
    if (basis === void 0) continue;
    const m = v.markets.find((x) => x.itemId === def.id);
    if (!m) continue;
    let sellAt = Math.max(1, m.bestAsk !== null ? m.bestAsk - 1 : Math.round(m.ema * 1.03));
    const since = agent.memo[`since_${def.id}`];
    const stale = since !== void 0 && state.tick - since > opts.staleHoldTicks;
    if (basis !== void 0 && !stale) {
      sellAt = Math.max(sellAt, Math.ceil((basis + 1) / (1 - GE_TAX_RATE)));
    }
    applyCommand(state, agent.id, { type: "place", itemId: def.id, side: "sell", price: sellAt, qty: held });
    dirty = true;
  }
  let vBuy = dirty ? playerView(state, agent.id) : v;
  if (!vBuy) return;
  const candidates = [];
  for (const m of vBuy.markets) {
    if (m.bestBid === null || m.bestAsk === null) continue;
    if (m.bestAskIsMine) continue;
    if ((vBuy.inventory[m.itemId] ?? 0) > 0 && agent.memo[`basis_${m.itemId}`] === void 0) continue;
    if (opts.focusItemId !== null && m.itemId !== opts.focusItemId) continue;
    const def = itemDef(state, m.itemId);
    if (!def || def.volatility > opts.maxVolatility) continue;
    if (activeEvent(state, m.itemId)) continue;
    const buyAt = m.bestBid + 1;
    const sellAt = m.bestAsk - 1;
    if (sellAt <= buyAt) continue;
    const profit = sellAt - Math.floor(sellAt * GE_TAX_RATE) - buyAt;
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
    const exitCap = Math.max(1, Math.floor(c.bidDepth / 2));
    const qty = Math.min(opts.maxQty, Math.floor(budget / c.buyAt), exitCap);
    if (qty < 1) continue;
    const r = applyCommand(state, agent.id, { type: "place", itemId: c.itemId, side: "buy", price: c.buyAt, qty });
    if (r.ok) {
      const prevBasis = agent.memo[`basis_${c.itemId}`];
      if (prevBasis === void 0) {
        agent.memo[`basis_${c.itemId}`] = c.buyAt;
      } else {
        const pos = (vBuy.inventory[c.itemId] ?? 0) + vBuy.openOrders.filter((o) => o.itemId === c.itemId).reduce((a, o) => a + o.remaining, 0);
        agent.memo[`basis_${c.itemId}`] = pos > 0 ? Math.round((prevBasis * pos + c.buyAt * qty) / (pos + qty)) : c.buyAt;
      }
      if (agent.memo[`since_${c.itemId}`] === void 0) agent.memo[`since_${c.itemId}`] = state.tick;
      placed++;
    }
  }
}

// packages/engine/src/quest.ts
var GEAR = {
  adamant_dart: { slot: "weapon", atk: 10, def: 0, req: 1 },
  rune_dart: { slot: "weapon", atk: 16, def: 0, req: 4 },
  battlestaff: { slot: "weapon", atk: 22, def: 1, req: 7 },
  dragon_dart: { slot: "weapon", atk: 26, def: 0, req: 8 },
  mystic_air_staff: { slot: "weapon", atk: 30, def: 1, req: 10 },
  mystic_earth_staff: { slot: "weapon", atk: 32, def: 1, req: 10 },
  rune_battleaxe: { slot: "weapon", atk: 38, def: 0, req: 12 },
  rune_2h_sword: { slot: "weapon", atk: 45, def: 0, req: 14 },
  dragon_mace: { slot: "weapon", atk: 40, def: 0, req: 16 },
  dragon_longsword: { slot: "weapon", atk: 50, def: 0, req: 20 },
  rune_full_helm: { slot: "helm", atk: 0, def: 12, req: 8 },
  dragon_med_helm: { slot: "helm", atk: 0, def: 16, req: 16 },
  rune_chainbody: { slot: "body", atk: 0, def: 22, req: 8 },
  rune_platebody: { slot: "body", atk: 0, def: 28, req: 12 },
  rune_plateskirt: { slot: "legs", atk: 0, def: 20, req: 10 },
  rune_platelegs: { slot: "legs", atk: 0, def: 20, req: 10 },
  dragon_platelegs: { slot: "legs", atk: 0, def: 30, req: 18 },
  dragon_plateskirt: { slot: "legs", atk: 0, def: 30, req: 18 },
  rune_sq_shield: { slot: "shield", atk: 0, def: 14, req: 6 },
  rune_kiteshield: { slot: "shield", atk: 0, def: 18, req: 10 }
};
var CONSUMABLES = {
  shark: { heal: 20 },
  cooked_karambwan: { heal: 18 },
  prayer_regeneration_potion_4: { heal: 30 },
  super_antifire_potion_4: { heal: 5, antifire: true },
  // A defensive brew: +10 def for the whole dive — a per-dive ~16k investment
  // like the antifire ticket, for pushing deep on defence (9v).
  divine_bastion_potion_4: { heal: 0, boostDef: 10 },
  // The offensive counterpart (10n): +10 atk for the dive (faster kills = less
  // attrition, less leech). Pricier (~40k) — offence pays for itself in loot.
  goading_potion_4: { heal: 0, boostAtk: 10 }
};
var ELITE_CHANCE = 0.1;
var MONSTERS = [
  { id: "giant_rat", name: "Giant rat", hp: 8, atk: 3, def: 0, gp: [2, 12], drops: [] },
  { id: "goblin", name: "Goblin", hp: 12, atk: 4, def: 1, gp: [5, 30], drops: [{ itemId: "adamant_dart", chance: 0.15 }] },
  { id: "skeleton", name: "Skeleton", hp: 22, atk: 7, def: 3, gp: [15, 60], drops: [{ itemId: "law_rune", chance: 0.12 }] },
  { id: "hill_giant", name: "Hill giant", hp: 35, atk: 9, def: 4, gp: [40, 180], drops: [{ itemId: "nature_rune", chance: 0.25 }, { itemId: "death_rune", chance: 0.1 }] },
  { id: "moss_giant", name: "Moss giant", hp: 45, atk: 11, def: 6, gp: [60, 240], drops: [{ itemId: "blood_rune", chance: 0.18 }] },
  // Deep-tier reward design (FINDINGS #51): monster GP is an UNBOUNDED faucet
  // — at real kill rates (~2 ticks/kill for a leveled fighter) any fat gp
  // range prints. ITEM drops are market-bounded: the liquidation mark walks
  // finite bid depth, so flooding the book caps itself. Deep monsters pay in
  // goods, modest coin.
  { id: "lesser_demon", name: "Lesser demon", hp: 70, atk: 16, def: 9, gp: [120, 360], drops: [{ itemId: "death_rune", chance: 0.4 }, { itemId: "rune_full_helm", chance: 0.1 }] },
  { id: "fire_giant", name: "Fire giant", hp: 85, atk: 19, def: 11, gp: [150, 450], drops: [{ itemId: "rune_battleaxe", chance: 0.12 }, { itemId: "blood_rune", chance: 0.5 }] },
  // Bones at 0.15: a 16.7k-baseCost item at 100% made Maw farming a 29× sprint
  // printer (FINDINGS #47). EV ≈ 3.1k/kill keeps dragons the best farm without
  // printing; Vorkanth keeps his 100% — elites are the jackpot.
  // Bones at 0.25: measured CAP-BOUND — the TAS-route tail is set by bid
  // depth (the market absorbs ~a dozen bones/sprint, the rest mark 0), so a
  // lower rate only starves casual raiders without touching the tail.
  { id: "green_dragon", name: "Green dragon", hp: 110, atk: 24, def: 12, gp: [200, 600], dragonfire: true, drops: [{ itemId: "superior_dragon_bones", chance: 0.25 }, { itemId: "dragon_med_helm", chance: 0.02 }, { itemId: "rune_kiteshield", chance: 0.08 }] },
  // The Inferno Gate (8t): every dweller breathes fire; fights are long.
  // Goods-over-coin throughout (FINDINGS #51) — bones are bid-capped, the
  // dragon weapons are rare. dragon_plateskirt (121k) is deliberately on NO
  // regular table.
  { id: "pyrefiend", name: "Pyrefiend", hp: 95, atk: 22, def: 12, gp: [150, 400], dragonfire: true, drops: [{ itemId: "death_rune", chance: 0.5 }, { itemId: "blood_rune", chance: 0.4 }, { itemId: "dragon_dart", chance: 0.12 }] },
  { id: "lava_dragon", name: "Lava dragon", hp: 160, atk: 27, def: 14, gp: [250, 700], dragonfire: true, drops: [{ itemId: "superior_dragon_bones", chance: 0.35 }, { itemId: "dragon_mace", chance: 0.04 }, { itemId: "dragon_longsword", chance: 0.02 }] },
  // The Abyss (9e): no fire down here — the toll is your PURSE. Leeches
  // drain loot gp every round the fight drags; kill fast or bleed coin.
  { id: "abyssal_leech", name: "Abyssal leech", hp: 60, atk: 18, def: 10, gp: [100, 300], leech: 40, drops: [{ itemId: "blood_rune", chance: 0.35 }] },
  { id: "abyssal_demon", name: "Abyssal demon", hp: 130, atk: 30, def: 18, gp: [400, 1e3], leech: 80, drops: [{ itemId: "death_rune", chance: 0.6 }, { itemId: "dragon_dart", chance: 0.2 }] },
  // The named elites — never in a region pool; their region spawns them.
  // Skarn (11g): the FIRST elite, stalking the Wilderness Ruins — gives mid-game
  // raiders a jackpot before the deep three. Tier between fire_giant and Vorkanth;
  // pays in Wilderness rune-gear, NOT the deep elites' 16.7k bone (no mid printer).
  { id: "skarn", name: "Skarn, the Ruin-Walker", hp: 130, atk: 24, def: 13, gp: [800, 2200], elite: true, drops: [{ itemId: "blood_rune", chance: 0.6 }, { itemId: "rune_battleaxe", chance: 0.2 }, { itemId: "rune_platebody", chance: 0.1 }] },
  { id: "vorkanth", name: "Vorkanth, Elder of the Maw", hp: 180, atk: 30, def: 16, gp: [1500, 4e3], dragonfire: true, elite: true, drops: [{ itemId: "superior_dragon_bones", chance: 1 }, { itemId: "dragon_med_helm", chance: 0.25 }, { itemId: "dragon_platelegs", chance: 0.15 }] },
  { id: "zukrath", name: "Zukrath, the Inferno Sovereign", hp: 260, atk: 36, def: 20, gp: [3e3, 8e3], dragonfire: true, elite: true, drops: [{ itemId: "superior_dragon_bones", chance: 1 }, { itemId: "prayer_regeneration_potion_4", chance: 0.3 }, { itemId: "dragon_longsword", chance: 0.2 }] },
  // dragon_plateskirt (121k baseCost) lives ONLY here — the Abyss jackpot.
  { id: "vessith", name: "Vessith, the Unraveler", hp: 300, atk: 40, def: 22, gp: [5e3, 12e3], leech: 200, elite: true, drops: [{ itemId: "superior_dragon_bones", chance: 1 }, { itemId: "dragon_plateskirt", chance: 0.25 }, { itemId: "prayer_regeneration_potion_4", chance: 0.2 }] }
];
var PLAYER_BASE = { maxHp: 50, atk: 5, def: 2 };
var REST_REGEN_TICKS = 3;
var REGIONS = [
  { id: "lumbridge_plains", name: "Lumbridge Plains", flavor: "soft hills, soft monsters", monsters: ["giant_rat", "goblin"] },
  { id: "varrock_sewers", name: "Varrock Sewers", flavor: "it smells like XP down here", monsters: ["goblin", "skeleton"] },
  { id: "edgeville_dungeon", name: "Edgeville Dungeon", flavor: "the giants pay well", monsters: ["skeleton", "hill_giant"] },
  { id: "brimhaven_caverns", name: "Brimhaven Caverns", flavor: "moss, mould, and money", monsters: ["moss_giant", "hill_giant"] },
  { id: "wilderness_ruins", name: "Wilderness Ruins", flavor: "demons hoard runes \u2014 and something worse walks here", monsters: ["lesser_demon", "fire_giant"], elite: "skarn" },
  { id: "dragons_maw", name: "The Dragon's Maw", flavor: "bring antifire or bring regrets", monsters: ["green_dragon", "fire_giant"], elite: "vorkanth" },
  // 8t: the 99-track. EVERYTHING here breathes fire — the antifire ticket is
  // not optional, and the fights are long enough that the trained stats from
  // 8n/8s are the real entry requirement.
  { id: "inferno_gate", name: "The Inferno Gate", flavor: "the air itself burns \u2014 no potion, no entry", monsters: ["pyrefiend", "lava_dragon"], elite: "zukrath" },
  // 9e: past the fire, the dark that EATS. No dragonfire — the toll here is
  // your loot purse, drained every round a fight drags on.
  { id: "the_abyss", name: "The Abyss", flavor: "it eats light, gold, and the unprepared", monsters: ["abyssal_leech", "abyssal_demon"], elite: "vessith" }
];
var REGION_CLEAR_KILLS = 3;
function regionIndex(id) {
  return REGIONS.findIndex((r) => r.id === id);
}
function expeditionSeed(worldSeed, expeditionId) {
  return (worldSeed ^ 2654435769) + Math.imul(expeditionId, 2246822507) >>> 0;
}
var ENCOUNTERS = {
  monster: 0.6,
  cache: 0.15,
  trap: 0.1
  // remainder: a choice event (shrine/gamble, 50/50)
};
var SHRINE_MIN_COST = 50;
var GAMBLE_STAKE = 100;
var IMP_PRIZE = [150, 400];
var MERCHANT_MARKUP = 3;
var SPAR_XP = 25;
var SPAR_BRUISES = [5, 12];
var TOLL_COST = 150;
var FORGE_COST = 300;
var FORGE_ATK = 8;
var BLOOD_HP = 20;
var BLOOD_ATK = 14;
var COURIER_FRACTION = 0.5;
var COURIER_CUT = 0.2;
var CACHE_ITEM_CHANCE = 0.25;
var AMBUSH_CHANCE = 0.08;
var CACHE_LOOT = [
  { minRegion: 0, items: ["law_rune", "nature_rune", "cooked_karambwan"] },
  { minRegion: 2, items: ["death_rune", "blood_rune", "shark"] },
  { minRegion: 4, items: ["shark", "cooked_karambwan", "blood_rune"] }
];
function cachePool(regionIdx) {
  let pool = CACHE_LOOT[0].items;
  for (const tier of CACHE_LOOT) {
    if (regionIdx >= tier.minRegion) pool = tier.items;
  }
  return pool;
}
var MAX_LEVEL = 99;
var XP_CURVE_K = 4;
function levelFor(xp) {
  return Math.min(MAX_LEVEL, 1 + Math.floor(Math.sqrt(Math.max(0, xp) / XP_CURVE_K)));
}
function levelsOf(xp) {
  return { atk: levelFor(xp?.atk ?? 0), def: levelFor(xp?.def ?? 0), hp: levelFor(xp?.hp ?? 0) };
}
var HP_PER_LEVEL = 2;
function maxHpFor(hpLevel) {
  return PLAYER_BASE.maxHp + HP_PER_LEVEL * (hpLevel - 1);
}
function deriveStats(pack, lvls = { atk: 1, def: 1 }, worn) {
  const best = {};
  for (const [itemId, qty] of Object.entries(pack)) {
    if (qty < 1) continue;
    const g = GEAR[itemId];
    if (!g) continue;
    if ((g.slot === "weapon" ? lvls.atk : lvls.def) < g.req) continue;
    const cur = best[g.slot];
    if (!cur || g.atk + g.def > cur.atk + cur.def) best[g.slot] = g;
  }
  if (worn) {
    for (const itemId of Object.values(worn)) {
      const g = GEAR[itemId];
      if (!g) continue;
      if ((g.slot === "weapon" ? lvls.atk : lvls.def) < g.req) continue;
      best[g.slot] = g;
    }
  }
  let atk = PLAYER_BASE.atk + (lvls.atk - 1);
  let def = PLAYER_BASE.def + (lvls.def - 1);
  for (const g of Object.values(best)) {
    atk += g.atk;
    def += g.def;
  }
  return { atk, def };
}
function monsterById(id) {
  const m = MONSTERS.find((x) => x.id === id);
  if (!m) throw new Error(`unknown monster ${id}`);
  return m;
}
function newCombat(monsterId, playerHp, intro, antifire = false, maxHp = PLAYER_BASE.maxHp) {
  const m = monsterById(monsterId);
  return {
    monsterId,
    monsterHp: m.hp,
    playerHp,
    // Seeded from the expedition: one potion covers the whole dive (8r).
    antifire,
    // Trained Hitpoints raise the heal cap (8s). Absent in old saves' combats.
    maxHp,
    outcome: "fighting",
    lootGp: 0,
    lootItems: [],
    log: [intro ?? `a ${m.name} blocks the path`]
  };
}
var FLEE_CHANCE = 0.6;
function hitChance(atk, def) {
  return Math.min(0.95, Math.max(0.15, 0.55 + (atk - def) * 0.02));
}
function damage(rng, atk, def) {
  const raw = rng.int(Math.max(1, Math.ceil(atk / 3)), Math.max(2, atk));
  return Math.max(1, raw - Math.floor(def / 4));
}
function resolveRound(state, stats, action, rng) {
  if (state.outcome !== "fighting") return;
  const m = monsterById(state.monsterId);
  if (action.kind === "flee") {
    if (rng.chance(FLEE_CHANCE)) {
      state.outcome = "fled";
      state.log.push("you slip away into the shadows");
      return;
    }
    state.log.push("no escape \u2014 it cuts you off");
  } else if (action.kind === "eat") {
    const c = CONSUMABLES[action.itemId];
    if (c) {
      state.playerHp = Math.min(state.maxHp ?? PLAYER_BASE.maxHp, state.playerHp + c.heal);
      if (c.antifire) state.antifire = true;
      state.log.push(`you down the ${action.itemId.replace(/_/g, " ")} (+${c.heal} hp)`);
    } else {
      state.log.push("nothing edible there");
    }
  } else {
    if (rng.chance(hitChance(stats.atk, m.def))) {
      const dmg = damage(rng, stats.atk, m.def);
      state.monsterHp -= dmg;
      state.log.push(`you strike the ${m.name} for ${dmg}`);
    } else {
      state.log.push(`the ${m.name} turns your blow`);
    }
    if (state.monsterHp <= 0) {
      state.outcome = "won";
      state.lootGp = rng.int(m.gp[0], m.gp[1]);
      for (const d of m.drops) {
        if (rng.chance(d.chance)) state.lootItems.push(d.itemId);
      }
      state.log.push(`the ${m.name} falls \u2014 ${state.lootGp} gp${state.lootItems.length > 0 ? " and loot" : ""}`);
      return;
    }
  }
  if (rng.chance(hitChance(m.atk, stats.def))) {
    let dmg = damage(rng, m.atk, stats.def);
    let note = "";
    if (m.dragonfire) {
      if (state.antifire) note = " (antifire holds)";
      else {
        dmg += Math.ceil(m.atk / 2);
        note = " \u2014 searing breath!";
      }
    }
    state.playerHp -= dmg;
    state.log.push(`the ${m.name} hits you for ${dmg}${note}`);
  } else {
    state.log.push(`you dodge the ${m.name}`);
  }
  if (state.playerHp <= 0) {
    state.playerHp = 0;
    state.outcome = "dead";
    state.log.push("darkness takes you");
  }
}

// packages/engine/src/rng.ts
function createRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = s + 1831565813 >>> 0;
    let t = s;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min, max) {
      if (max < min) throw new Error(`rng.int: max < min (${min}, ${max})`);
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(arr) {
      if (arr.length === 0) throw new Error("rng.pick: empty array");
      return arr[Math.floor(next() * arr.length)];
    },
    chance(p) {
      return next() < p;
    },
    state() {
      return s;
    }
  };
}
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// packages/engine/src/catalog.ts
var DEFAULT_ITEMS = [
  { id: "adamant_dart", name: "Adamant dart", baseCost: 23, consumeValue: 47, volatility: 0.08, wikiId: 810, wikiPrice: 31, buyLimit: 11e3 },
  { id: "logs", name: "Logs", baseCost: 23, consumeValue: 46, volatility: 0.08, wikiId: 1511, wikiPrice: 30, buyLimit: 15e3 },
  { id: "oak_logs", name: "Oak logs", baseCost: 23, consumeValue: 46, volatility: 0.08, wikiId: 1521, wikiPrice: 30, buyLimit: 15e3 },
  { id: "lava_rune", name: "Lava rune", baseCost: 25, consumeValue: 50, volatility: 0.08, wikiId: 4699, wikiPrice: 33, buyLimit: 18e3 },
  { id: "adamant_arrow", name: "Adamant arrow", baseCost: 29, consumeValue: 59, volatility: 0.08, wikiId: 890, wikiPrice: 39, buyLimit: 11e3 },
  { id: "numulite", name: "Numulite", baseCost: 33, consumeValue: 66, volatility: 0.08, wikiId: 21555, wikiPrice: 44, buyLimit: 3e4 },
  { id: "forester_s_ration", name: "Forester's ration", baseCost: 37, consumeValue: 74, volatility: 0.08, wikiId: 28157, wikiPrice: 49, buyLimit: 6e3 },
  { id: "mithril_nails", name: "Mithril nails", baseCost: 50, consumeValue: 101, volatility: 0.08, wikiId: 4822, wikiPrice: 67, buyLimit: 13e3 },
  { id: "rune_arrow", name: "Rune arrow", baseCost: 51, consumeValue: 102, volatility: 0.08, wikiId: 892, wikiPrice: 68, buyLimit: 11e3 },
  { id: "silver_ore", name: "Silver ore", baseCost: 53, consumeValue: 106, volatility: 0.08, wikiId: 442, wikiPrice: 70, buyLimit: 13e3 },
  { id: "smoke_rune", name: "Smoke rune", baseCost: 56, consumeValue: 112, volatility: 0.08, wikiId: 4697, wikiPrice: 74, buyLimit: 18e3 },
  { id: "iron_ore", name: "Iron ore", baseCost: 57, consumeValue: 114, volatility: 0.08, wikiId: 440, wikiPrice: 76, buyLimit: 13e3 },
  { id: "mist_rune", name: "Mist rune", baseCost: 57, consumeValue: 114, volatility: 0.08, wikiId: 4695, wikiPrice: 76, buyLimit: 18e3 },
  { id: "runite_bolts", name: "Runite bolts", baseCost: 59, consumeValue: 119, volatility: 0.08, wikiId: 9144, wikiPrice: 79, buyLimit: 11e3 },
  { id: "grapes", name: "Grapes", baseCost: 62, consumeValue: 124, volatility: 0.08, wikiId: 1987, wikiPrice: 82, buyLimit: 2e4 },
  { id: "steam_rune", name: "Steam rune", baseCost: 71, consumeValue: 143, volatility: 0.08, wikiId: 4694, wikiPrice: 95, buyLimit: 18e3 },
  { id: "mithril_dart_tip", name: "Mithril dart tip", baseCost: 78, consumeValue: 156, volatility: 0.09, wikiId: 822, wikiPrice: 104, buyLimit: 2e4 },
  { id: "soft_clay", name: "Soft clay", baseCost: 78, consumeValue: 156, volatility: 0.09, wikiId: 1761, wikiPrice: 104, buyLimit: 13e3 },
  { id: "chaos_rune", name: "Chaos rune", baseCost: 80, consumeValue: 160, volatility: 0.09, wikiId: 562, wikiPrice: 106, buyLimit: 18e3 },
  { id: "astral_rune", name: "Astral rune", baseCost: 80, consumeValue: 160, volatility: 0.09, wikiId: 9075, wikiPrice: 106, buyLimit: 25e3 },
  { id: "molten_glass", name: "Molten glass", baseCost: 81, consumeValue: 162, volatility: 0.09, wikiId: 1775, wikiPrice: 108, buyLimit: 13e3 },
  { id: "bow_string", name: "Bow string", baseCost: 84, consumeValue: 168, volatility: 0.09, wikiId: 1777, wikiPrice: 112, buyLimit: 13e3 },
  { id: "gold_bar", name: "Gold bar", baseCost: 85, consumeValue: 170, volatility: 0.09, wikiId: 2357, wikiPrice: 113, buyLimit: 1e4 },
  { id: "law_rune", name: "Law rune", baseCost: 90, consumeValue: 180, volatility: 0.09, wikiId: 563, wikiPrice: 120, buyLimit: 18e3 },
  { id: "yew_logs", name: "Yew logs", baseCost: 90, consumeValue: 180, volatility: 0.09, wikiId: 1515, wikiPrice: 120, buyLimit: 12e3 },
  { id: "cosmic_rune", name: "Cosmic rune", baseCost: 93, consumeValue: 186, volatility: 0.09, wikiId: 564, wikiPrice: 124, buyLimit: 18e3 },
  { id: "nature_rune", name: "Nature rune", baseCost: 95, consumeValue: 190, volatility: 0.09, wikiId: 561, wikiPrice: 126, buyLimit: 18e3 },
  { id: "adamant_bolts", name: "Adamant bolts", baseCost: 95, consumeValue: 190, volatility: 0.09, wikiId: 9143, wikiPrice: 126, buyLimit: 11e3 },
  { id: "gold_ore", name: "Gold ore", baseCost: 116, consumeValue: 233, volatility: 0.09, wikiId: 444, wikiPrice: 155, buyLimit: 3e4 },
  { id: "mithril_ore", name: "Mithril ore", baseCost: 119, consumeValue: 238, volatility: 0.09, wikiId: 447, wikiPrice: 158, buyLimit: 13e3 },
  { id: "coal", name: "Coal", baseCost: 122, consumeValue: 245, volatility: 0.09, wikiId: 453, wikiPrice: 163, buyLimit: 13e3 },
  { id: "mithril_cannonball", name: "Mithril cannonball", baseCost: 123, consumeValue: 246, volatility: 0.09, wikiId: 31910, wikiPrice: 164, buyLimit: 11e3 },
  { id: "diamond_bolts_e", name: "Diamond bolts (e)", baseCost: 125, consumeValue: 250, volatility: 0.09, wikiId: 9243, wikiPrice: 166, buyLimit: 11e3 },
  { id: "revenant_ether", name: "Revenant ether", baseCost: 133, consumeValue: 266, volatility: 0.09, wikiId: 21820, wikiPrice: 177, buyLimit: 3e4 },
  { id: "zulrah_s_scales", name: "Zulrah's scales", baseCost: 134, consumeValue: 268, volatility: 0.09, wikiId: 12934, wikiPrice: 178, buyLimit: 3e4 },
  { id: "death_rune", name: "Death rune", baseCost: 138, consumeValue: 276, volatility: 0.09, wikiId: 560, wikiPrice: 184, buyLimit: 25e3 },
  { id: "adamant_dart_tip", name: "Adamant dart tip", baseCost: 143, consumeValue: 287, volatility: 0.09, wikiId: 823, wikiPrice: 191, buyLimit: 2e4 },
  { id: "amethyst_arrow", name: "Amethyst arrow", baseCost: 147, consumeValue: 294, volatility: 0.09, wikiId: 21326, wikiPrice: 196, buyLimit: 11e3 },
  { id: "atlatl_dart", name: "Atlatl dart", baseCost: 153, consumeValue: 306, volatility: 0.09, wikiId: 28991, wikiPrice: 204, buyLimit: 11e3 },
  { id: "rune_dart", name: "Rune dart", baseCost: 155, consumeValue: 310, volatility: 0.09, wikiId: 811, wikiPrice: 206, buyLimit: 11e3 },
  { id: "amethyst_dart", name: "Amethyst dart", baseCost: 165, consumeValue: 330, volatility: 0.09, wikiId: 25849, wikiPrice: 220, buyLimit: 11e3 },
  { id: "amethyst_arrowtips", name: "Amethyst arrowtips", baseCost: 167, consumeValue: 335, volatility: 0.09, wikiId: 21350, wikiPrice: 223, buyLimit: 1e4 },
  { id: "yew_longbow_u", name: "Yew longbow (u)", baseCost: 170, consumeValue: 341, volatility: 0.09, wikiId: 66, wikiPrice: 227, buyLimit: 1e4 },
  { id: "mahogany_logs", name: "Mahogany logs", baseCost: 176, consumeValue: 352, volatility: 0.09, wikiId: 6332, wikiPrice: 234, buyLimit: 11e3 },
  { id: "raw_karambwan", name: "Raw karambwan", baseCost: 200, consumeValue: 401, volatility: 0.09, wikiId: 3142, wikiPrice: 267, buyLimit: 13e3 },
  { id: "sapphire", name: "Sapphire", baseCost: 204, consumeValue: 408, volatility: 0.09, wikiId: 1607, wikiPrice: 272, buyLimit: 13e3 },
  { id: "steel_cannonball", name: "Steel cannonball", baseCost: 211, consumeValue: 422, volatility: 0.09, wikiId: 2, wikiPrice: 281, buyLimit: 11e3 },
  { id: "blood_rune", name: "Blood rune", baseCost: 227, consumeValue: 455, volatility: 0.09, wikiId: 565, wikiPrice: 303, buyLimit: 25e3 },
  { id: "wrath_rune", name: "Wrath rune", baseCost: 233, consumeValue: 466, volatility: 0.09, wikiId: 21880, wikiPrice: 310, buyLimit: 25e3 },
  { id: "blighted_ancient_ice_sack", name: "Blighted ancient ice sack", baseCost: 253, consumeValue: 506, volatility: 0.09, wikiId: 24607, wikiPrice: 337, buyLimit: 15e3 },
  { id: "demon_tear", name: "Demon tear", baseCost: 254, consumeValue: 509, volatility: 0.09, wikiId: 31111, wikiPrice: 339, buyLimit: 13e3 },
  { id: "aether_catalyst", name: "Aether catalyst", baseCost: 268, consumeValue: 536, volatility: 0.09, wikiId: 30771, wikiPrice: 357, buyLimit: 25e3 },
  { id: "soul_rune", name: "Soul rune", baseCost: 284, consumeValue: 568, volatility: 0.09, wikiId: 566, wikiPrice: 378, buyLimit: 25e3 },
  { id: "sunfire_splinters", name: "Sunfire splinters", baseCost: 290, consumeValue: 581, volatility: 0.09, wikiId: 28924, wikiPrice: 387, buyLimit: 3e4 },
  { id: "amethyst_dart_tip", name: "Amethyst dart tip", baseCost: 312, consumeValue: 624, volatility: 0.09, wikiId: 25853, wikiPrice: 416, buyLimit: 11e3 },
  { id: "cooked_karambwan", name: "Cooked karambwan", baseCost: 344, consumeValue: 688, volatility: 0.09, wikiId: 3144, wikiPrice: 458, buyLimit: 1e4 },
  { id: "oak_plank", name: "Oak plank", baseCost: 359, consumeValue: 718, volatility: 0.09, wikiId: 8778, wikiPrice: 478, buyLimit: 13e3 },
  { id: "rune_javelin_tips", name: "Rune javelin tips", baseCost: 389, consumeValue: 779, volatility: 0.09, wikiId: 19580, wikiPrice: 519, buyLimit: 1e4 },
  { id: "yew_longbow", name: "Yew longbow", baseCost: 391, consumeValue: 782, volatility: 0.09, wikiId: 855, wikiPrice: 521, buyLimit: 18e3 },
  { id: "adamantite_ore", name: "Adamantite ore", baseCost: 466, consumeValue: 932, volatility: 0.09, wikiId: 449, wikiPrice: 621, buyLimit: 4500 },
  { id: "steel_bar", name: "Steel bar", baseCost: 480, consumeValue: 960, volatility: 0.09, wikiId: 2353, wikiPrice: 640, buyLimit: 1e4 },
  { id: "raw_shark", name: "Raw shark", baseCost: 488, consumeValue: 977, volatility: 0.09, wikiId: 383, wikiPrice: 651, buyLimit: 15e3 },
  { id: "snape_grass", name: "Snape grass", baseCost: 536, consumeValue: 1072, volatility: 0.09, wikiId: 231, wikiPrice: 714, buyLimit: 13e3 },
  { id: "aether_rune", name: "Aether rune", baseCost: 596, consumeValue: 1193, volatility: 0.09, wikiId: 30843, wikiPrice: 795, buyLimit: 25e3 },
  { id: "redwood_logs", name: "Redwood logs", baseCost: 623, consumeValue: 1246, volatility: 0.09, wikiId: 19669, wikiPrice: 830, buyLimit: 12e3 },
  { id: "teak_plank", name: "Teak plank", baseCost: 647, consumeValue: 1294, volatility: 0.09, wikiId: 8780, wikiPrice: 862, buyLimit: 13e3 },
  { id: "rune_cannonball", name: "Rune cannonball", baseCost: 647, consumeValue: 1294, volatility: 0.09, wikiId: 31914, wikiPrice: 862, buyLimit: 11e3 },
  { id: "shark", name: "Shark", baseCost: 692, consumeValue: 1385, volatility: 0.09, wikiId: 385, wikiPrice: 923, buyLimit: 1e4 },
  { id: "magic_logs", name: "Magic logs", baseCost: 695, consumeValue: 1390, volatility: 0.09, wikiId: 1513, wikiPrice: 926, buyLimit: 12e3 },
  { id: "mithril_bar", name: "Mithril bar", baseCost: 718, consumeValue: 1436, volatility: 0.09, wikiId: 2359, wikiPrice: 957, buyLimit: 1e4 },
  { id: "magic_longbow", name: "Magic longbow", baseCost: 908, consumeValue: 1817, volatility: 0.1, wikiId: 859, wikiPrice: 1211, buyLimit: 18e3 },
  { id: "uncut_ruby", name: "Uncut ruby", baseCost: 915, consumeValue: 1830, volatility: 0.1, wikiId: 1619, wikiPrice: 1220, buyLimit: 1e4 },
  { id: "dragon_dart", name: "Dragon dart", baseCost: 1011, consumeValue: 2022, volatility: 0.1, wikiId: 11230, wikiPrice: 1348, buyLimit: 11e3 },
  { id: "air_orb", name: "Air orb", baseCost: 1130, consumeValue: 2261, volatility: 0.1, wikiId: 573, wikiPrice: 1507, buyLimit: 11e3 },
  { id: "dragon_dart_tip", name: "Dragon dart tip", baseCost: 1247, consumeValue: 2495, volatility: 0.1, wikiId: 11232, wikiPrice: 1663, buyLimit: 11e3 },
  { id: "adamantite_bar", name: "Adamantite bar", baseCost: 1477, consumeValue: 2954, volatility: 0.1, wikiId: 2361, wikiPrice: 1969, buyLimit: 1e4 },
  { id: "mahogany_plank", name: "Mahogany plank", baseCost: 1565, consumeValue: 3130, volatility: 0.1, wikiId: 8782, wikiPrice: 2086, buyLimit: 13e3 },
  { id: "dragon_arrow", name: "Dragon arrow", baseCost: 2155, consumeValue: 4310, volatility: 0.1, wikiId: 11212, wikiPrice: 2873, buyLimit: 11e3 },
  { id: "dragon_bones", name: "Dragon bones", baseCost: 2207, consumeValue: 4414, volatility: 0.1, wikiId: 536, wikiPrice: 2942, buyLimit: 7500 },
  { id: "battlestaff", name: "Battlestaff", baseCost: 5768, consumeValue: 11537, volatility: 0.12, wikiId: 1391, wikiPrice: 7691, buyLimit: 11e3 },
  { id: "sanfew_serum_4", name: "Sanfew serum(4)", baseCost: 15050, consumeValue: 30100, volatility: 0.13, wikiId: 10925, wikiPrice: 20066, buyLimit: 2e3 },
  { id: "palm_sapling", name: "Palm sapling", baseCost: 15317, consumeValue: 30635, volatility: 0.13, wikiId: 5502, wikiPrice: 20423, buyLimit: 200 },
  { id: "rune_full_helm", name: "Rune full helm", baseCost: 15464, consumeValue: 30929, volatility: 0.13, wikiId: 1163, wikiPrice: 20619, buyLimit: 70 },
  { id: "dragon_nails", name: "Dragon nails", baseCost: 15520, consumeValue: 31040, volatility: 0.13, wikiId: 31406, wikiPrice: 20693, buyLimit: 13e3 },
  { id: "extended_super_antifire_4", name: "Extended super antifire(4)", baseCost: 15917, consumeValue: 31834, volatility: 0.13, wikiId: 22209, wikiPrice: 21222, buyLimit: 2e3 },
  { id: "divine_bastion_potion_4", name: "Divine bastion potion(4)", baseCost: 16048, consumeValue: 32096, volatility: 0.13, wikiId: 24635, wikiPrice: 21397, buyLimit: 2e3 },
  { id: "crystal_key", name: "Crystal key", baseCost: 16189, consumeValue: 32378, volatility: 0.13, wikiId: 989, wikiPrice: 21585, buyLimit: 11e3 },
  { id: "superior_dragon_bones", name: "Superior dragon bones", baseCost: 16737, consumeValue: 33474, volatility: 0.13, wikiId: 22124, wikiPrice: 22316, buyLimit: 7500 },
  { id: "rune_sq_shield", name: "Rune sq shield", baseCost: 17051, consumeValue: 34102, volatility: 0.13, wikiId: 1185, wikiPrice: 22734, buyLimit: 70 },
  { id: "super_antifire_potion_4", name: "Super antifire potion(4)", baseCost: 17250, consumeValue: 34500, volatility: 0.13, wikiId: 21978, wikiPrice: 23e3, buyLimit: 2e3 },
  { id: "crushed_superior_dragon_bones", name: "Crushed superior dragon bones", baseCost: 17341, consumeValue: 34682, volatility: 0.13, wikiId: 21975, wikiPrice: 23121, buyLimit: 11e3 },
  { id: "yew_seed", name: "Yew seed", baseCost: 17387, consumeValue: 34775, volatility: 0.13, wikiId: 5315, wikiPrice: 23183, buyLimit: 200 },
  { id: "magpie_impling_jar", name: "Magpie impling jar", baseCost: 17993, consumeValue: 35986, volatility: 0.13, wikiId: 11252, wikiPrice: 23990, buyLimit: 18e3 },
  { id: "rune_battleaxe", name: "Rune battleaxe", baseCost: 18643, consumeValue: 37286, volatility: 0.13, wikiId: 1373, wikiPrice: 24857, buyLimit: 70 },
  { id: "ranarr_seed", name: "Ranarr seed", baseCost: 18662, consumeValue: 37324, volatility: 0.13, wikiId: 5295, wikiPrice: 24882, buyLimit: 200 },
  { id: "rune_warhammer", name: "Rune warhammer", baseCost: 18680, consumeValue: 37360, volatility: 0.13, wikiId: 1347, wikiPrice: 24906, buyLimit: 70 },
  { id: "mystic_air_staff", name: "Mystic air staff", baseCost: 18712, consumeValue: 37424, volatility: 0.13, wikiId: 1405, wikiPrice: 24949, buyLimit: 18e3 },
  { id: "mystic_earth_staff", name: "Mystic earth staff", baseCost: 18764, consumeValue: 37528, volatility: 0.13, wikiId: 1407, wikiPrice: 25018, buyLimit: 18e3 },
  { id: "yew_sapling", name: "Yew sapling", baseCost: 19742, consumeValue: 39484, volatility: 0.13, wikiId: 5373, wikiPrice: 26322, buyLimit: 200 },
  { id: "dragon_mace", name: "Dragon mace", baseCost: 21951, consumeValue: 43902, volatility: 0.13, wikiId: 1434, wikiPrice: 29268, buyLimit: 70 },
  { id: "rune_chainbody", name: "Rune chainbody", baseCost: 22104, consumeValue: 44208, volatility: 0.13, wikiId: 1113, wikiPrice: 29472, buyLimit: 70 },
  { id: "rune_kiteshield", name: "Rune kiteshield", baseCost: 24053, consumeValue: 48107, volatility: 0.13, wikiId: 1201, wikiPrice: 32071, buyLimit: 70 },
  { id: "rune_2h_sword", name: "Rune 2h sword", baseCost: 28448, consumeValue: 56896, volatility: 0.13, wikiId: 1319, wikiPrice: 37930, buyLimit: 70 },
  { id: "rune_platelegs", name: "Rune platelegs", baseCost: 28631, consumeValue: 57263, volatility: 0.13, wikiId: 1079, wikiPrice: 38175, buyLimit: 70 },
  { id: "rune_plateskirt", name: "Rune plateskirt", baseCost: 28800, consumeValue: 57600, volatility: 0.13, wikiId: 1093, wikiPrice: 38400, buyLimit: 70 },
  { id: "rune_platebody", name: "Rune platebody", baseCost: 28826, consumeValue: 57652, volatility: 0.13, wikiId: 1127, wikiPrice: 38434, buyLimit: 70 },
  { id: "ninja_impling_jar", name: "Ninja impling jar", baseCost: 28970, consumeValue: 57941, volatility: 0.13, wikiId: 11254, wikiPrice: 38627, buyLimit: 18e3 },
  { id: "bracelet_of_ethereum_uncharged", name: "Bracelet of ethereum (uncharged)", baseCost: 32300, consumeValue: 64600, volatility: 0.13, wikiId: 21817, wikiPrice: 43066, buyLimit: 1e4 },
  { id: "aldarium", name: "Aldarium", baseCost: 35468, consumeValue: 70936, volatility: 0.13, wikiId: 29993, wikiPrice: 47290, buyLimit: 13e3 },
  { id: "snapdragon_seed", name: "Snapdragon seed", baseCost: 39447, consumeValue: 78894, volatility: 0.13, wikiId: 5300, wikiPrice: 52596, buyLimit: 200 },
  { id: "goading_potion_4", name: "Goading potion(4)", baseCost: 40634, consumeValue: 81269, volatility: 0.13, wikiId: 30137, wikiPrice: 54179, buyLimit: 2e3 },
  { id: "dragon_med_helm", name: "Dragon med helm", baseCost: 43949, consumeValue: 87898, volatility: 0.13, wikiId: 1149, wikiPrice: 58598, buyLimit: 8 },
  { id: "dragon_longsword", name: "Dragon longsword", baseCost: 44312, consumeValue: 88625, volatility: 0.13, wikiId: 1305, wikiPrice: 59083, buyLimit: 70 },
  { id: "prayer_regeneration_potion_4", name: "Prayer regeneration potion(4)", baseCost: 48808, consumeValue: 97616, volatility: 0.13, wikiId: 30125, wikiPrice: 65077, buyLimit: 2e3 },
  { id: "magic_seed", name: "Magic seed", baseCost: 60444, consumeValue: 120888, volatility: 0.13, wikiId: 5316, wikiPrice: 80592, buyLimit: 200 },
  { id: "magic_sapling", name: "Magic sapling", baseCost: 62438, consumeValue: 124876, volatility: 0.13, wikiId: 5374, wikiPrice: 83250, buyLimit: 200 },
  { id: "dragon_platelegs", name: "Dragon platelegs", baseCost: 120842, consumeValue: 241684, volatility: 0.13, wikiId: 4087, wikiPrice: 161122, buyLimit: 70 },
  { id: "dragon_plateskirt", name: "Dragon plateskirt", baseCost: 121463, consumeValue: 242926, volatility: 0.13, wikiId: 4585, wikiPrice: 161950, buyLimit: 70 },
  { id: "maple_shortbow_u", name: "Maple shortbow (u)", baseCost: 187531, consumeValue: 375062, volatility: 0.13, wikiId: 64, wikiPrice: 250041, buyLimit: 1e4 },
  { id: "dragon_metal_sheet", name: "Dragon metal sheet", baseCost: 214271, consumeValue: 428543, volatility: 0.13, wikiId: 31996, wikiPrice: 285695, buyLimit: 64 }
];

// packages/engine/src/sim.ts
var BOUNTY_CHECK_TICKS = 600;
var BOUNTY_MAX_OPEN = 2;
var BOUNTY_DURATION_TICKS = 2400;
function createWorld(cfg) {
  const items = cfg.items ?? DEFAULT_ITEMS;
  const state = {
    tick: 0,
    seed: cfg.seed,
    rngState: createRng(cfg.seed).state(),
    nextOrderId: 1,
    items,
    agents: [],
    books: {},
    trades: [],
    events: [],
    contracts: [],
    nextContractId: 1,
    ledger: {
      gpInitial: 0,
      gpMinted: 0,
      gpBurned: 0,
      itemsInitial: {},
      itemsMinted: {},
      itemsBurned: {}
    },
    stats: {
      tradesTotal: 0,
      ordersPlaced: 0,
      ordersRejected: 0,
      ordersCancelled: 0,
      npcBailouts: 0,
      eventsSpawned: 0,
      contractsFilled: 0
    }
  };
  for (const def of items) {
    state.books[def.id] = createBook(def.id, Math.round((def.baseCost + def.consumeValue) / 2));
  }
  const producersPerItem = cfg.producersPerItem ?? 2;
  const consumersPerItem = cfg.consumersPerItem ?? 3;
  const marketMakersPerItem = cfg.marketMakersPerItem ?? 1;
  const momentumTraders = cfg.momentumTraders ?? Math.max(4, Math.round(items.length * 0.8));
  const noiseTraders = cfg.noiseTraders ?? Math.max(6, Math.round(items.length * 1.2));
  const players = cfg.players ?? 1;
  for (const def of items) {
    const mid = Math.round((def.baseCost + def.consumeValue) / 2);
    for (let i = 0; i < producersPerItem; i++) addAgent(state, "producer", 0, { [def.id]: 20 }, def.id);
    for (let i = 0; i < consumersPerItem; i++) addAgent(state, "consumer", def.consumeValue * 10, {}, def.id);
    for (let i = 0; i < marketMakersPerItem; i++) addAgent(state, "marketMaker", mid * 40, { [def.id]: 12 }, def.id);
  }
  for (let i = 0; i < momentumTraders; i++) addAgent(state, "momentum", 25e3, {});
  for (let i = 0; i < noiseTraders; i++) {
    const inv = {};
    for (const def of items) inv[def.id] = 3;
    addAgent(state, "noise", 8e3, inv);
  }
  for (let i = 0; i < players; i++) addAgent(state, "player", 5e4, {});
  return state;
}
function addAgent(state, kind, gp, inventory, itemId) {
  const agent = {
    id: state.agents.length,
    kind,
    gp,
    inventory: { ...inventory },
    memo: { startGp: gp }
  };
  if (itemId !== void 0) agent.itemId = itemId;
  if (kind === "player") {
    agent.slots = PROGRESSION.startingSlots;
    agent.policy = "scripted-flipper";
  }
  state.agents.push(agent);
  state.ledger.gpInitial += gp;
  for (const k of Object.keys(inventory).sort()) {
    state.ledger.itemsInitial[k] = (state.ledger.itemsInitial[k] ?? 0) + (inventory[k] ?? 0);
  }
  return agent;
}
function tickWorld(state) {
  const rng = createRng(state.rngState);
  state.tick++;
  if (!state.events) state.events = [];
  if (!state.contracts) state.contracts = [];
  if (state.nextContractId === void 0) state.nextContractId = 1;
  if (state.tick % TUNING.contracts.checkEvery === 0) {
    state.contracts = state.contracts.filter((c) => c.expiresTick > state.tick);
    if (state.contracts.length < TUNING.contracts.maxOpen && rng.chance(TUNING.contracts.chance)) {
      const def = rng.pick(state.items);
      const book = state.books[def.id];
      if (book) {
        const mid = Math.max(1, Math.round(book.ema));
        const qty = Math.min(80, Math.max(2, Math.round(TUNING.contracts.targetGp / mid)));
        const premium = TUNING.contracts.premiumMin + rng.next() * (TUNING.contracts.premiumMax - TUNING.contracts.premiumMin);
        const duration = rng.int(TUNING.contracts.minDuration, TUNING.contracts.maxDuration);
        state.contracts.push({
          id: state.nextContractId++,
          itemId: def.id,
          qty,
          unitPrice: Math.max(1, Math.round(mid * premium)),
          expiresTick: state.tick + duration
        });
      }
    }
  }
  if (state.tick % TUNING.events.checkEvery === 0) {
    state.events = state.events.filter((e) => e.endTick > state.tick);
    if (rng.chance(TUNING.events.chance)) {
      const def = rng.pick(state.items);
      if (!state.events.some((e) => e.itemId === def.id)) {
        const kinds = ["supply_shock", "demand_surge", "supply_glut", "demand_slump"];
        const kind = rng.pick(kinds);
        const duration = rng.int(TUNING.events.minDuration, TUNING.events.maxDuration);
        state.events.push({
          id: `${kind}_${def.id}_${state.tick}`,
          itemId: def.id,
          kind,
          startTick: state.tick,
          endTick: state.tick + duration
        });
        state.stats.eventsSpawned++;
      }
    }
  }
  for (const agent of state.agents) {
    actAgent(state, agent, rng);
    if (agent.kind === "player" && agent.sellsword) actSellsword(state, agent);
  }
  if (state.tick % BOUNTY_CHECK_TICKS === 0) {
    state.bounties = (state.bounties ?? []).filter((b) => b.expiresTick > state.tick);
    if (state.bounties.length < BOUNTY_MAX_OPEN) {
      const brng = createRng(expeditionSeed(state.seed, 1107296256 + state.tick));
      const m = brng.pick(MONSTERS);
      const qty = m.elite ? 1 : brng.int(3, 8);
      const mid = Math.round((m.gp[0] + m.gp[1]) / 2);
      state.bounties.push({
        id: state.nextBountyId ?? 1,
        monsterId: m.id,
        qty,
        // The realm pays roughly double the coin the corpses carry — the
        // premium is for hunting on ITS schedule, not yours.
        rewardGp: Math.max(50, qty * mid * 2),
        expiresTick: state.tick + BOUNTY_DURATION_TICKS,
        baseline: state.stats.killsByMonster?.[m.id] ?? 0
      });
      state.nextBountyId = (state.nextBountyId ?? 1) + 1;
    }
  }
  if (state.tick % REST_REGEN_TICKS === 0) {
    for (const agent of state.agents) {
      if (agent.kind !== "player" || agent.hp === void 0 || agent.expedition) continue;
      agent.hp += 1;
      if (agent.hp >= maxHpFor(levelsOf(agent.combatXp).hp)) delete agent.hp;
    }
  }
  state.rngState = rng.state();
}

// packages/engine/src/commands.ts
var BUY_LIMIT_WINDOW_TICKS = 4e3;
var MASTERY_BASE = 40;
var MASTERY_PER_REGION = 30;
function buyRemaining(state, agent, itemId) {
  const def = itemDef(state, itemId);
  const limit = def?.buyLimit ?? 0;
  if (limit <= 0) return null;
  const w = agent.buyWindows?.[itemId];
  if (!w || state.tick - w.windowStart >= BUY_LIMIT_WINDOW_TICKS) return limit;
  return Math.max(0, limit - w.bought);
}
var PROGRESSION = {
  startingSlots: 3,
  maxSlots: 8,
  /** Cost of slot 4, 5, 6, 7, 8 — burned (gp sink), not paid to anyone. */
  slotCosts: [25e3, 75e3, 2e5, 5e5, 125e4],
  /** Automation tiers; cost of tier N is costs[N-1]. All burned. */
  upgrades: {
    autoFlip: { costs: [5e4, 15e4, 4e5] },
    /** The Sellsword (9h): a hireling who runs your expeditions while you
     * trade — shallow regions only, conservative, levels YOUR stats. */
    sellsword: { costs: [3e4] },
    /** Death Ward (10e): a deep gp sink that softens death — keep your 5 most
     * valuable carried items instead of 3. */
    deathWard: { costs: [1e5] }
  }
};
var DEATH_KEEP_BASE = 3;
var DEATH_KEEP_WARDED = 5;
function expeditionDeath(state, agent, exp) {
  const keepN = (agent.upgrades?.["deathWard"] ?? 0) > 0 ? DEATH_KEEP_WARDED : DEATH_KEEP_BASE;
  const units = [];
  for (const [itemId, qty] of Object.entries(exp.pack)) {
    const cost = itemDef(state, itemId)?.baseCost ?? 0;
    for (let i = 0; i < qty; i++) units.push({ itemId, cost });
  }
  units.sort((a, b) => b.cost - a.cost || (a.itemId < b.itemId ? -1 : 1));
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (i < keepN) agent.inventory[u.itemId] = (agent.inventory[u.itemId] ?? 0) + 1;
    else state.ledger.itemsBurned[u.itemId] = (state.ledger.itemsBurned[u.itemId] ?? 0) + 1;
  }
  state.ledger.gpBurned += exp.packGp;
  state.stats.deaths = (state.stats.deaths ?? 0) + 1;
  agent.hp = 1;
  delete agent.expedition;
}
function beginExpedition(state, agent, regionId, packIn) {
  const idx = regionIndex(regionId);
  const pack = {};
  for (const [itemId, qty] of Object.entries(packIn)) {
    agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) - qty;
    pack[itemId] = qty;
  }
  const expId = state.nextExpeditionId ?? 1;
  state.nextExpeditionId = expId + 1;
  state.stats.deepestRegion = Math.max(state.stats.deepestRegion ?? 0, idx);
  agent.expedition = {
    regionId,
    rngState: expeditionSeed(state.seed, expId),
    // Wounds persist: you set out with the hp you came home with (absent =
    // full — full meaning your TRAINED max, 8s). Embarking hurt is allowed.
    hp: Math.min(maxHpFor(levelsOf(agent.combatXp).hp), Math.max(1, agent.hp ?? maxHpFor(levelsOf(agent.combatXp).hp))),
    pack,
    packGp: 0,
    cleared: 0,
    combat: null
  };
}
function finishExtract(agent, exp) {
  for (const [itemId, qty] of Object.entries(exp.pack)) {
    if (qty > 0) agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) + qty;
  }
  agent.gp += exp.packGp;
  if (exp.hp < maxHpFor(levelsOf(agent.combatXp).hp)) agent.hp = Math.max(1, exp.hp);
  else delete agent.hp;
  delete agent.expedition;
}
function runCombatRound(state, agent, exp, action) {
  if (!exp.combat) return;
  if (action.kind === "eat") {
    exp.pack[action.itemId] = exp.pack[action.itemId] - 1;
    state.ledger.itemsBurned[action.itemId] = (state.ledger.itemsBurned[action.itemId] ?? 0) + 1;
    const cd = CONSUMABLES[action.itemId];
    if (cd?.antifire) exp.antifire = true;
    if (cd?.boostAtk || cd?.boostDef) exp.boost = { atk: cd.boostAtk ?? 0, def: cd.boostDef ?? 0 };
  }
  const rng = createRng(exp.rngState);
  const lvBefore = levelsOf(agent.combatXp);
  const hpBefore = { monster: exp.combat.monsterHp, player: exp.combat.playerHp };
  const stats = deriveStats(exp.pack, lvBefore, agent.worn);
  if (exp.boost) {
    stats.atk += exp.boost.atk;
    stats.def += exp.boost.def;
  }
  resolveRound(exp.combat, stats, action, rng);
  exp.rngState = rng.state();
  const c = exp.combat;
  const leech = monsterById(c.monsterId).leech ?? 0;
  if (leech > 0 && c.outcome === "fighting" && exp.packGp > 0) {
    const drained = Math.min(exp.packGp, leech);
    exp.packGp -= drained;
    state.ledger.gpBurned += drained;
    c.log.push(`it siphons ${drained} gp from your pack`);
  }
  const dealt = Math.max(0, hpBefore.monster - c.monsterHp);
  const taken = Math.max(0, hpBefore.player - c.playerHp);
  if (dealt + taken > 0) {
    const xp = agent.combatXp ??= { atk: 0, def: 0 };
    xp.atk += dealt;
    xp.def += taken;
    if (dealt > 0) xp.hp = (xp.hp ?? 0) + Math.ceil(dealt / 3);
    const lv = levelsOf(xp);
    const journal = exp.journal ??= [];
    if (lv.atk > lvBefore.atk) journal.push(`your arm grows stronger \u2014 Attack ${lv.atk}`);
    if (lv.def > lvBefore.def) journal.push(`you learn to take a blow \u2014 Defence ${lv.def}`);
    if (lv.hp > lvBefore.hp) journal.push(`your vitality surges \u2014 Hitpoints ${lv.hp} (max hp ${maxHpFor(lv.hp)})`);
  }
  if (c.outcome === "won") {
    state.ledger.gpMinted += c.lootGp;
    exp.packGp += c.lootGp;
    for (const itemId of c.lootItems) {
      state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
      exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
    }
    exp.cleared += 1;
    exp.hp = c.playerHp;
    state.stats.monstersSlain = (state.stats.monstersSlain ?? 0) + 1;
    const tally = state.stats.killsByMonster ??= {};
    tally[c.monsterId] = (tally[c.monsterId] ?? 0) + 1;
    if (monsterById(c.monsterId).elite) {
      state.stats.eliteSlain = (state.stats.eliteSlain ?? 0) + 1;
    }
    const idx = regionIndex(exp.regionId);
    if (exp.cleared >= REGION_CLEAR_KILLS && idx === (agent.questProgress ?? 0) && idx < REGIONS.length - 1) {
      agent.questProgress = idx + 1;
      const masteryXp = MASTERY_BASE + MASTERY_PER_REGION * idx;
      const mx = agent.combatXp ??= { atk: 0, def: 0 };
      mx.atk += masteryXp;
      mx.def += masteryXp;
      mx.hp = (mx.hp ?? 0) + Math.ceil(masteryXp / 3);
      (exp.journal ??= []).push(`${REGIONS[idx].name} mastered \u2014 +${masteryXp} combat xp`);
    }
    exp.combat = null;
  } else if (c.outcome === "dead") {
    expeditionDeath(state, agent, exp);
  } else if (c.outcome === "fled") {
    exp.hp = c.playerHp;
    exp.combat = null;
  }
}
function rollEncounter(state, agent, exp) {
  const region = REGIONS[regionIndex(exp.regionId)];
  const rng = createRng(exp.rngState);
  const roll = rng.next();
  const journal = exp.journal ??= [];
  if (roll < ENCOUNTERS.monster) {
    const rIdx = regionIndex(exp.regionId);
    const af = exp.antifire ?? false;
    const mhp = maxHpFor(levelsOf(agent.combatXp).hp);
    if (region.elite && rng.chance(ELITE_CHANCE)) {
      exp.combat = newCombat(
        region.elite,
        exp.hp,
        `the ground shakes \u2014 ${monsterById(region.elite).name.toUpperCase()} descends!`,
        af,
        mhp
      );
    } else if (rIdx < REGIONS.length - 1 && rng.chance(AMBUSH_CHANCE)) {
      const deeper = REGIONS[rIdx + 1];
      const beast = rng.pick(deeper.monsters);
      exp.combat = newCombat(beast, exp.hp, `AMBUSH \u2014 a ${monsterById(beast).name} from ${deeper.name} crosses your path!`, af, mhp);
    } else {
      exp.combat = newCombat(rng.pick(region.monsters), exp.hp, void 0, af, mhp);
    }
  } else if (roll < ENCOUNTERS.monster + ENCOUNTERS.cache) {
    const rIdx = regionIndex(exp.regionId);
    const found = rng.int(20, 60 + 40 * rIdx);
    state.ledger.gpMinted += found;
    exp.packGp += found;
    state.stats.cacheFinds = (state.stats.cacheFinds ?? 0) + 1;
    if (rng.chance(CACHE_ITEM_CHANCE)) {
      const itemId = rng.pick(cachePool(rIdx));
      state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
      exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
      journal.push(`you pry open a forgotten cache: +${found} gp and a ${itemId.replace(/_/g, " ")}`);
    } else {
      journal.push(`you pry open a forgotten cache: +${found} gp`);
    }
  } else if (roll < ENCOUNTERS.monster + ENCOUNTERS.cache + ENCOUNTERS.trap) {
    const dmg = rng.int(3, 6 + 3 * regionIndex(exp.regionId));
    exp.hp -= dmg;
    journal.push(`a snare bites \u2014 ${dmg} hp`);
    if (exp.hp <= 0) {
      journal.push("the trap was the last thing you never saw");
      expeditionDeath(state, agent, exp);
    }
  } else {
    const rIdx = regionIndex(exp.regionId);
    const kinds = ["shrine", "gamble", "imp"];
    if (rIdx >= 1 && rIdx < REGIONS.length - 1) kinds.push("portal");
    if (rIdx >= 1) kinds.push("spar");
    if (rIdx >= 2) kinds.push("toll");
    if (rIdx >= 2) kinds.push("courier");
    if (rIdx >= 2) kinds.push("forge");
    if (rIdx >= 2) kinds.push("altar");
    if (rIdx >= 3) kinds.push("merchant");
    const kind = rng.pick(kinds);
    const prompt = kind === "shrine" ? "a shrine hums in the dark \u2014 tithe a quarter of your loot gp for full healing?" : kind === "gamble" ? `a goblin rattles a cup of dice \u2014 stake ${GAMBLE_STAKE} loot gp, double or nothing?` : kind === "imp" ? "an imp scampers past with a bulging coin pouch \u2014 give chase?" : kind === "portal" ? `a humming portal opens \u2014 beyond it, ${REGIONS[rIdx + 1].name}. step through?` : kind === "spar" ? "a grizzled swordmaster bars the path, blade flat \u2014 take a lesson in bruises?" : kind === "toll" ? `a toll-keeper rattles his cup \u2014 ${TOLL_COST} gp for word of a nearby stash?` : kind === "courier" ? `a strongbox courier offers to ship half your loot home, safe from death \u2014 for a ${Math.round(COURIER_CUT * 100)}% cut?` : kind === "forge" ? `a wandering smith fires a field forge \u2014 ${FORGE_COST} gp to whet your blade for +${FORGE_ATK} Attack the rest of this dive?` : kind === "altar" ? `a blood altar pulses \u2014 spill ${BLOOD_HP} health for +${BLOOD_ATK} Attack the rest of this dive?` : "a soot-cloaked merchant offers a shark at triple price \u2014 pay up?";
    exp.event = { kind, prompt };
  }
  exp.rngState = rng.state();
}
function actSellsword(state, agent) {
  if (agent.kind !== "player" || !agent.sellsword || (agent.upgrades?.["sellsword"] ?? 0) < 1) return;
  const T = TUNING.sellsword;
  if (state.tick % T.cadence !== 0) return;
  const exp = agent.expedition;
  if (!exp) {
    const max = maxHpFor(levelsOf(agent.combatXp).hp);
    if ((agent.hp ?? max) < Math.min(T.embarkHp, max)) return;
    let target = Math.min(agent.questProgress ?? 0, T.maxRegion);
    while (target > 0 && !REGIONS[target].monsters.some((id) => monsterById(id).atk < T.fleeAtk)) target--;
    beginExpedition(state, agent, REGIONS[target].id, {});
    return;
  }
  if (exp.combat) {
    const m = monsterById(exp.combat.monsterId);
    const danger = m.elite === true || m.dragonfire === true || (m.leech ?? 0) > 0 || m.atk >= T.fleeAtk;
    const action = danger || exp.combat.playerHp < T.retreatHp ? { kind: "flee" } : { kind: "fight" };
    const slainBefore = state.stats.monstersSlain ?? 0;
    runCombatRound(state, agent, exp, action);
    if ((state.stats.monstersSlain ?? 0) > slainBefore) {
      state.stats.sellswordKills = (state.stats.sellswordKills ?? 0) + 1;
    }
    return;
  }
  if (exp.event) {
    (exp.journal ??= []).push("the sellsword walks on");
    exp.event = null;
    return;
  }
  if (exp.cleared >= REGION_CLEAR_KILLS || exp.hp < T.retreatHp) {
    state.stats.sellswordBanked = (state.stats.sellswordBanked ?? 0) + exp.packGp;
    finishExtract(agent, exp);
    return;
  }
  rollEncounter(state, agent, exp);
}
function playerOf(state, playerId) {
  const agent = state.agents[playerId];
  if (!agent || agent.id !== playerId || agent.kind !== "player") return null;
  return agent;
}
function slotsOf(agent) {
  return agent.slots ?? PROGRESSION.startingSlots;
}
function countOpenOrders(state, agentId) {
  let n = 0;
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    for (const o of book.buys) if (o.agentId === agentId) n++;
    for (const o of book.sells) if (o.agentId === agentId) n++;
  }
  return n;
}
function applyCommand(state, playerId, cmd) {
  const agent = state.agents[playerId];
  if (!agent || agent.id !== playerId) return { ok: false, reason: "unknown-player", trades: [] };
  if (agent.kind !== "player") return { ok: false, reason: "not-a-player", trades: [] };
  switch (cmd.type) {
    case "place": {
      if (countOpenOrders(state, agent.id) >= slotsOf(agent)) {
        return { ok: false, reason: "no-free-slots", trades: [] };
      }
      if (cmd.side === "buy") {
        const remaining = buyRemaining(state, agent, cmd.itemId);
        if (remaining !== null && cmd.qty > remaining) {
          return { ok: false, reason: "buy-limit", trades: [] };
        }
      }
      const res = placeOrder(state, agent, cmd.itemId, cmd.side, cmd.price, cmd.qty);
      if (res.accepted && cmd.side === "buy") {
        const def = itemDef(state, cmd.itemId);
        if ((def?.buyLimit ?? 0) > 0) {
          if (!agent.buyWindows) agent.buyWindows = {};
          const w = agent.buyWindows[cmd.itemId];
          if (!w || state.tick - w.windowStart >= BUY_LIMIT_WINDOW_TICKS) {
            agent.buyWindows[cmd.itemId] = { windowStart: state.tick, bought: cmd.qty };
          } else {
            w.bought += cmd.qty;
          }
        }
      }
      const out = { ok: res.accepted, trades: res.trades };
      if (res.reason !== void 0) out.reason = res.reason;
      return out;
    }
    case "cancel": {
      cancelAgentOrders(state, agent, cmd.itemId, cmd.side);
      return { ok: true, trades: [] };
    }
    case "buySlot": {
      const slots = slotsOf(agent);
      const cost = PROGRESSION.slotCosts[slots - PROGRESSION.startingSlots];
      if (cost === void 0 || slots >= PROGRESSION.maxSlots) {
        return { ok: false, reason: "max-slots", trades: [] };
      }
      if (agent.gp < cost) return { ok: false, reason: "insufficient-gp", trades: [] };
      agent.gp -= cost;
      state.ledger.gpBurned += cost;
      agent.slots = slots + 1;
      return { ok: true, trades: [] };
    }
    case "buyUpgrade": {
      if (!Object.hasOwn(PROGRESSION.upgrades, cmd.upgradeId)) {
        return { ok: false, reason: "unknown-upgrade", trades: [] };
      }
      const def = PROGRESSION.upgrades[cmd.upgradeId];
      const tier = agent.upgrades?.[cmd.upgradeId] ?? 0;
      const cost = def.costs[tier];
      if (cost === void 0) return { ok: false, reason: "max-tier", trades: [] };
      if (agent.gp < cost) return { ok: false, reason: "insufficient-gp", trades: [] };
      agent.gp -= cost;
      state.ledger.gpBurned += cost;
      if (!agent.upgrades) agent.upgrades = {};
      agent.upgrades[cmd.upgradeId] = tier + 1;
      return { ok: true, trades: [] };
    }
    case "configureBot": {
      const cfg = { ...agent.botConfig ?? {} };
      if (cmd.maxVolatility !== void 0) {
        if (!Number.isFinite(cmd.maxVolatility)) return { ok: false, reason: "bad-config", trades: [] };
        cfg.maxVolatility = Math.min(1, Math.max(0.01, cmd.maxVolatility));
      }
      if (cmd.capitalFraction !== void 0) {
        if (!Number.isFinite(cmd.capitalFraction)) return { ok: false, reason: "bad-config", trades: [] };
        cfg.capitalFraction = Math.min(0.5, Math.max(0.1, cmd.capitalFraction));
      }
      if (cmd.focusItemId !== void 0) {
        if (cmd.focusItemId !== null && !state.items.some((i) => i.id === cmd.focusItemId)) {
          return { ok: false, reason: "unknown-item", trades: [] };
        }
        cfg.focusItemId = cmd.focusItemId;
      }
      agent.botConfig = cfg;
      return { ok: true, trades: [] };
    }
    case "fulfillContract": {
      const contracts = state.contracts ?? [];
      const idx = contracts.findIndex((c) => c.id === cmd.contractId);
      if (idx === -1) return { ok: false, reason: "unknown-contract", trades: [] };
      const contract = contracts[idx];
      if (contract.expiresTick <= state.tick) return { ok: false, reason: "contract-expired", trades: [] };
      if ((agent.inventory[contract.itemId] ?? 0) < contract.qty) {
        return { ok: false, reason: "insufficient-items", trades: [] };
      }
      agent.inventory[contract.itemId] = (agent.inventory[contract.itemId] ?? 0) - contract.qty;
      state.ledger.itemsBurned[contract.itemId] = (state.ledger.itemsBurned[contract.itemId] ?? 0) + contract.qty;
      const payout = contract.qty * contract.unitPrice;
      agent.gp += payout;
      state.ledger.gpMinted += payout;
      contracts.splice(idx, 1);
      state.stats.contractsFilled = (state.stats.contractsFilled ?? 0) + 1;
      return { ok: true, trades: [] };
    }
    case "startExpedition": {
      if (agent.expedition) return { ok: false, reason: "already-out", trades: [] };
      const idx = regionIndex(cmd.regionId);
      if (idx === -1) return { ok: false, reason: "unknown-region", trades: [] };
      if (idx > (agent.questProgress ?? 0)) return { ok: false, reason: "region-locked", trades: [] };
      if (typeof cmd.pack !== "object" || cmd.pack === null) return { ok: false, reason: "bad-pack", trades: [] };
      for (const [itemId, qty] of Object.entries(cmd.pack)) {
        if (!Number.isSafeInteger(qty) || qty < 1) return { ok: false, reason: "bad-pack", trades: [] };
        if ((agent.inventory[itemId] ?? 0) < qty) return { ok: false, reason: "insufficient-items", trades: [] };
      }
      beginExpedition(state, agent, cmd.regionId, cmd.pack);
      return { ok: true, trades: [] };
    }
    case "advance": {
      const exp = agent.expedition;
      if (!exp) return { ok: false, reason: "not-out", trades: [] };
      if (exp.combat) return { ok: false, reason: "in-combat", trades: [] };
      if (exp.event) return { ok: false, reason: "in-event", trades: [] };
      tickWorld(state);
      rollEncounter(state, agent, exp);
      return { ok: true, trades: [] };
    }
    case "choose": {
      const exp = agent.expedition;
      if (!exp || !exp.event) return { ok: false, reason: "no-event", trades: [] };
      const ev = exp.event;
      const rng = createRng(exp.rngState);
      const journal = exp.journal ??= [];
      if (!cmd.accept) {
        journal.push("you walk on");
      } else if (ev.kind === "shrine") {
        const cost = Math.max(SHRINE_MIN_COST, Math.floor(exp.packGp / 4));
        if (exp.packGp < cost) {
          journal.push("the shrine finds your offering wanting");
        } else {
          exp.packGp -= cost;
          state.ledger.gpBurned += cost;
          exp.hp = maxHpFor(levelsOf(agent.combatXp).hp);
          journal.push(`the shrine takes ${cost} gp and knits your wounds`);
        }
      } else if (ev.kind === "portal") {
        const idx = Math.min(regionIndex(exp.regionId) + 1, REGIONS.length - 1);
        exp.regionId = REGIONS[idx].id;
        state.stats.deepestRegion = Math.max(state.stats.deepestRegion ?? 0, idx);
        journal.push(`you step through \u2014 ${REGIONS[idx].name}`);
      } else if (ev.kind === "imp") {
        if (rng.chance(0.5)) {
          const prize = rng.int(IMP_PRIZE[0], IMP_PRIZE[1]);
          state.ledger.gpMinted += prize;
          exp.packGp += prize;
          journal.push(`you snatch the pouch: +${prize} gp`);
        } else {
          const dmg = rng.int(4, 8 + 2 * regionIndex(exp.regionId));
          exp.hp -= dmg;
          journal.push(`the imp leads you into a snare \u2014 ${dmg} hp`);
          if (exp.hp <= 0) {
            journal.push("the imp's laughter is the last thing you hear");
            expeditionDeath(state, agent, exp);
          }
        }
      } else if (ev.kind === "spar") {
        const bruise = rng.int(SPAR_BRUISES[0], SPAR_BRUISES[1]);
        exp.hp = Math.max(1, exp.hp - bruise);
        const lvBefore = levelsOf(agent.combatXp);
        const xp = agent.combatXp ??= { atk: 0, def: 0 };
        xp.atk += SPAR_XP;
        xp.def += SPAR_XP;
        xp.hp = (xp.hp ?? 0) + Math.ceil(SPAR_XP / 3);
        const lv = levelsOf(xp);
        journal.push(`the swordmaster's lesson leaves bruises (\u2212${bruise} hp) \u2014 and understanding (+${SPAR_XP} \u2694, +${SPAR_XP} \u{1F6E1} xp)`);
        if (lv.atk > lvBefore.atk) journal.push(`your arm grows stronger \u2014 Attack ${lv.atk}`);
        if (lv.def > lvBefore.def) journal.push(`you learn to take a blow \u2014 Defence ${lv.def}`);
        if (lv.hp > lvBefore.hp) journal.push(`your vitality surges \u2014 Hitpoints ${lv.hp} (max hp ${maxHpFor(lv.hp)})`);
      } else if (ev.kind === "toll") {
        if (exp.packGp < TOLL_COST) {
          journal.push("the toll-keeper sizes up your purse and waves you off");
        } else {
          exp.packGp -= TOLL_COST;
          state.ledger.gpBurned += TOLL_COST;
          const rIdx = regionIndex(exp.regionId);
          const found = rng.int(20, 60 + 40 * rIdx);
          state.ledger.gpMinted += found;
          exp.packGp += found;
          state.stats.cacheFinds = (state.stats.cacheFinds ?? 0) + 1;
          if (rng.chance(CACHE_ITEM_CHANCE)) {
            const itemId = rng.pick(cachePool(rIdx));
            state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
            exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
            journal.push(`the toll-keeper's tip is good: a stash with ${found} gp and a ${itemId.replace(/_/g, " ")}`);
          } else {
            journal.push(`the toll-keeper's tip is good: a stash with ${found} gp`);
          }
        }
      } else if (ev.kind === "courier") {
        const shipped = Math.floor(exp.packGp * COURIER_FRACTION);
        if (shipped <= 0) {
          journal.push("the courier shrugs \u2014 nothing worth shipping yet");
        } else {
          const cut = Math.floor(shipped * COURIER_CUT);
          exp.packGp -= shipped;
          agent.gp += shipped - cut;
          state.ledger.gpBurned += cut;
          journal.push(`the courier ships ${(shipped - cut).toLocaleString("en-US")} gp home (${cut} gp cut)`);
        }
      } else if (ev.kind === "merchant") {
        const price = (itemDef(state, "shark")?.baseCost ?? 700) * MERCHANT_MARKUP;
        if (exp.packGp < price) {
          journal.push("the merchant eyes your purse and turns away");
        } else {
          exp.packGp -= price;
          state.ledger.gpBurned += price;
          state.ledger.itemsMinted["shark"] = (state.ledger.itemsMinted["shark"] ?? 0) + 1;
          exp.pack["shark"] = (exp.pack["shark"] ?? 0) + 1;
          journal.push(`the merchant takes ${price} gp and hands over a shark`);
        }
      } else if (ev.kind === "forge") {
        if (exp.packGp < FORGE_COST) {
          journal.push("the smith eyes your purse and lets the fire die");
        } else {
          exp.packGp -= FORGE_COST;
          state.ledger.gpBurned += FORGE_COST;
          const prevDef = exp.boost?.def ?? 0;
          exp.boost = { atk: Math.max(exp.boost?.atk ?? 0, FORGE_ATK), def: prevDef };
          journal.push(`the smith whets your blade \u2014 +${FORGE_ATK} Attack until you surface`);
        }
      } else if (ev.kind === "altar") {
        if (exp.hp <= BLOOD_HP) {
          journal.push("the altar hungers for more blood than you can spare");
        } else {
          exp.hp -= BLOOD_HP;
          const prevDef = exp.boost?.def ?? 0;
          exp.boost = { atk: Math.max(exp.boost?.atk ?? 0, BLOOD_ATK), def: prevDef };
          journal.push(`you spill ${BLOOD_HP} hp on the altar \u2014 +${BLOOD_ATK} Attack until you surface`);
        }
      } else {
        if (exp.packGp < GAMBLE_STAKE) {
          journal.push("the goblin counts your purse and laughs");
        } else if (rng.chance(0.5)) {
          state.ledger.gpMinted += GAMBLE_STAKE;
          exp.packGp += GAMBLE_STAKE;
          state.stats.diceWon = (state.stats.diceWon ?? 0) + 1;
          journal.push(`the dice land your way: +${GAMBLE_STAKE} gp`);
        } else {
          exp.packGp -= GAMBLE_STAKE;
          state.ledger.gpBurned += GAMBLE_STAKE;
          journal.push(`the goblin scoops your ${GAMBLE_STAKE} gp, cackling`);
        }
      }
      exp.event = null;
      exp.rngState = rng.state();
      return { ok: true, trades: [] };
    }
    case "fight":
    case "fleeCombat":
    case "eatFood": {
      const exp = agent.expedition;
      if (cmd.type === "eatFood") {
        if (!exp) return { ok: false, reason: "not-out", trades: [] };
        if (!CONSUMABLES[cmd.itemId]) return { ok: false, reason: "not-edible", trades: [] };
        if ((exp.pack[cmd.itemId] ?? 0) < 1) return { ok: false, reason: "insufficient-items", trades: [] };
        if (!exp.combat) {
          if (exp.event) return { ok: false, reason: "in-event", trades: [] };
          tickWorld(state);
          exp.pack[cmd.itemId] = exp.pack[cmd.itemId] - 1;
          state.ledger.itemsBurned[cmd.itemId] = (state.ledger.itemsBurned[cmd.itemId] ?? 0) + 1;
          const c = CONSUMABLES[cmd.itemId];
          exp.hp = Math.min(maxHpFor(levelsOf(agent.combatXp).hp), exp.hp + c.heal);
          if (c.antifire) exp.antifire = true;
          if (c.boostAtk || c.boostDef) exp.boost = { atk: c.boostAtk ?? 0, def: c.boostDef ?? 0 };
          (exp.journal ??= []).push(
            `you ${c.antifire || c.boostAtk || c.boostDef ? "down" : "eat"} the ${cmd.itemId.replace(/_/g, " ")} by the fire (+${c.heal} hp)`
          );
          return { ok: true, trades: [] };
        }
      }
      if (!exp || !exp.combat) return { ok: false, reason: "not-in-combat", trades: [] };
      let action;
      if (cmd.type === "fight") action = { kind: "fight" };
      else if (cmd.type === "fleeCombat") action = { kind: "flee" };
      else action = { kind: "eat", itemId: cmd.itemId };
      tickWorld(state);
      runCombatRound(state, agent, exp, action);
      return { ok: true, trades: [] };
    }
    case "extract": {
      const exp = agent.expedition;
      if (!exp) return { ok: false, reason: "not-out", trades: [] };
      if (exp.combat) return { ok: false, reason: "in-combat", trades: [] };
      finishExtract(agent, exp);
      return { ok: true, trades: [] };
    }
    case "configureSellsword": {
      if ((agent.upgrades?.["sellsword"] ?? 0) < 1) return { ok: false, reason: "no-sellsword", trades: [] };
      if (cmd.active) agent.sellsword = true;
      else delete agent.sellsword;
      return { ok: true, trades: [] };
    }
    case "equip": {
      if (agent.expedition) return { ok: false, reason: "on-expedition", trades: [] };
      const g = GEAR[cmd.itemId];
      if (!g) return { ok: false, reason: "not-equippable", trades: [] };
      if ((agent.inventory[cmd.itemId] ?? 0) < 1) return { ok: false, reason: "not-owned", trades: [] };
      const lv = levelsOf(agent.combatXp);
      if ((g.slot === "weapon" ? lv.atk : lv.def) < g.req) return { ok: false, reason: "level-too-low", trades: [] };
      const worn = agent.worn ??= {};
      const prev = worn[g.slot];
      if (prev !== void 0) agent.inventory[prev] = (agent.inventory[prev] ?? 0) + 1;
      agent.inventory[cmd.itemId] = (agent.inventory[cmd.itemId] ?? 0) - 1;
      if ((agent.inventory[cmd.itemId] ?? 0) <= 0) delete agent.inventory[cmd.itemId];
      worn[g.slot] = cmd.itemId;
      return { ok: true, trades: [] };
    }
    case "unequip": {
      if (agent.expedition) return { ok: false, reason: "on-expedition", trades: [] };
      const id = agent.worn?.[cmd.slot];
      if (id === void 0) return { ok: false, reason: "nothing-equipped", trades: [] };
      agent.inventory[id] = (agent.inventory[id] ?? 0) + 1;
      delete agent.worn[cmd.slot];
      return { ok: true, trades: [] };
    }
    case "equipBest": {
      if (agent.expedition) return { ok: false, reason: "on-expedition", trades: [] };
      const lv = levelsOf(agent.combatXp);
      const worn = agent.worn ??= {};
      const bestPerSlot = {};
      for (const [itemId, g] of Object.entries(GEAR)) {
        if ((g.slot === "weapon" ? lv.atk : lv.def) < g.req) continue;
        const owned = (agent.inventory[itemId] ?? 0) > 0 || worn[g.slot] === itemId;
        if (!owned) continue;
        const cur = bestPerSlot[g.slot];
        const curG = cur ? GEAR[cur] : void 0;
        const score = g.atk + g.def;
        if (!curG || score > curG.atk + curG.def || score === curG.atk + curG.def && itemId < cur)
          bestPerSlot[g.slot] = itemId;
      }
      let changed = false;
      for (const [slot, itemId] of Object.entries(bestPerSlot)) {
        if (worn[slot] === itemId) continue;
        const prev = worn[slot];
        if (prev !== void 0) agent.inventory[prev] = (agent.inventory[prev] ?? 0) + 1;
        agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) - 1;
        if ((agent.inventory[itemId] ?? 0) <= 0) delete agent.inventory[itemId];
        worn[slot] = itemId;
        changed = true;
      }
      if (!changed) return { ok: false, reason: "no-upgrade", trades: [] };
      return { ok: true, trades: [] };
    }
    case "claimBounty": {
      const bounties = state.bounties ?? [];
      const idx = bounties.findIndex((b2) => b2.id === cmd.bountyId);
      if (idx === -1) return { ok: false, reason: "unknown-bounty", trades: [] };
      const b = bounties[idx];
      if (b.expiresTick <= state.tick) return { ok: false, reason: "bounty-expired", trades: [] };
      const kills = (state.stats.killsByMonster?.[b.monsterId] ?? 0) - b.baseline;
      if (kills < b.qty) return { ok: false, reason: "bounty-unfilled", trades: [] };
      state.ledger.gpMinted += b.rewardGp;
      agent.gp += b.rewardGp;
      state.stats.bountiesClaimed = (state.stats.bountiesClaimed ?? 0) + 1;
      bounties.splice(idx, 1);
      return { ok: true, trades: [] };
    }
  }
}
function playerView(state, playerId) {
  const agent = playerOf(state, playerId);
  if (!agent) return null;
  const slots = slotsOf(agent);
  const openOrders = [];
  const markets = [];
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    let bidDepth = 0;
    let askDepth = 0;
    for (const o of book.buys) {
      bidDepth += o.remaining;
      if (o.agentId === agent.id) {
        openOrders.push({ id: o.id, itemId: o.itemId, side: o.side, price: o.price, remaining: o.remaining });
      }
    }
    for (const o of book.sells) {
      askDepth += o.remaining;
      if (o.agentId === agent.id) {
        openOrders.push({ id: o.id, itemId: o.itemId, side: o.side, price: o.price, remaining: o.remaining });
      }
    }
    const bid = bestBid(book);
    const ask = bestAsk(book);
    markets.push({
      itemId: def.id,
      lastPrice: book.lastPrice,
      ema: book.ema,
      bestBid: bid ? bid.price : null,
      bestAsk: ask ? ask.price : null,
      bestBidIsMine: bid !== void 0 && bid.agentId === agent.id,
      bestAskIsMine: ask !== void 0 && ask.agentId === agent.id,
      bidDepth,
      askDepth,
      buyRemaining: buyRemaining(state, agent, def.id),
      volume: book.volume
    });
  }
  return {
    playerId: agent.id,
    gp: agent.gp,
    slots,
    nextSlotCost: PROGRESSION.slotCosts[slots - PROGRESSION.startingSlots] ?? null,
    upgrades: { ...agent.upgrades ?? {} },
    botConfig: {
      maxVolatility: agent.botConfig?.maxVolatility ?? null,
      capitalFraction: agent.botConfig?.capitalFraction ?? null,
      focusItemId: agent.botConfig?.focusItemId ?? null
    },
    contracts: (state.contracts ?? []).filter((c) => c.expiresTick > state.tick).map((c) => ({ id: c.id, itemId: c.itemId, qty: c.qty, unitPrice: c.unitPrice, expiresTick: c.expiresTick })),
    inventory: { ...agent.inventory },
    worn: { ...agent.worn ?? {} },
    openOrders,
    markets
  };
}

// packages/engine/src/hash.ts
function canonicalJson(value) {
  return JSON.stringify(sortKeys(value));
}
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v !== null && typeof v === "object") {
    const src = v;
    const out = {};
    for (const k of Object.keys(src).sort()) out[k] = sortKeys(src[k]);
    return out;
  }
  return v;
}
function hashState(value) {
  return fnv1a(canonicalJson(value)).toString(16).padStart(8, "0");
}

// packages/engine/src/report.ts
function netWorth(state, agent) {
  let total = agent.gp;
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    let qty = agent.inventory[def.id] ?? 0;
    if (agent.worn) {
      for (const id of Object.values(agent.worn)) if (id === def.id) qty += 1;
    }
    for (const o of book.buys) if (o.agentId === agent.id) total += o.escrowGp;
    for (const o of book.sells) if (o.agentId === agent.id) qty += o.remaining;
    for (const o of book.buys) {
      if (qty <= 0) break;
      if (o.agentId === agent.id) continue;
      const take = Math.min(qty, o.remaining);
      total += take * o.price;
      qty -= take;
    }
  }
  return total;
}

// packages/engine/src/replay.ts
var SPRINT_TICKS = 2e3;
var SPRINT_MAX_COMMANDS = 5e3;
function verifySprint(seed, startGp, log) {
  const bad = (reason) => ({ ok: false, reason, worth: 0, hash: "", deepest: 0 });
  if (!Number.isSafeInteger(seed) || seed < 0) return bad("bad-seed");
  if (!Number.isSafeInteger(startGp) || startGp < 1) return bad("bad-start");
  if (!Array.isArray(log) || log.length > SPRINT_MAX_COMMANDS) return bad("log-too-long");
  for (let i = 0; i < log.length; i++) {
    const e = log[i];
    if (!e || !Number.isSafeInteger(e.tick) || e.tick < 0 || e.tick >= SPRINT_TICKS) return bad("bad-tick");
    if (i > 0 && e.tick < log[i - 1].tick) return bad("out-of-order");
    if (typeof e.cmd !== "object" || e.cmd === null) return bad("bad-cmd");
  }
  try {
    const r = replayRun(seed, startGp, log, SPRINT_TICKS);
    return { ok: true, worth: r.worth, hash: r.hash, deepest: r.deepest };
  } catch {
    return bad("replay-error");
  }
}
function replayRun(seed, startGp, log, finalTick) {
  const world = createWorld({ seed });
  const human = addAgent(world, "player", startGp, {});
  human.policy = "idle";
  let i = 0;
  while (i < log.length && log[i].tick <= world.tick) {
    applyCommand(world, human.id, log[i].cmd);
    i++;
  }
  while (world.tick < finalTick) {
    tickWorld(world);
    while (i < log.length && log[i].tick <= world.tick) {
      applyCommand(world, human.id, log[i].cmd);
      i++;
    }
  }
  return {
    worth: netWorth(world, human),
    finalTick: world.tick,
    hash: hashState(world),
    deepest: world.stats.deepestRegion ?? 0
  };
}
export {
  SPRINT_MAX_COMMANDS,
  SPRINT_TICKS,
  replayRun,
  verifySprint
};
