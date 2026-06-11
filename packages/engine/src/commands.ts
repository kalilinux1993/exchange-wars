// The player surface. Bots, the future UI, and the future server all drive a
// player EXCLUSIVELY through applyCommand + playerView — never the internals.
// Everything in and out is plain JSON (null, never undefined in views).
import { bestAsk, bestBid, cancelAgentOrders, placeOrder } from './exchange';
import { itemDef } from './items';
import {
  AMBUSH_CHANCE,
  CACHE_ITEM_CHANCE,
  ELITE_CHANCE,
  cachePool,
  CONSUMABLES,
  deriveStats,
  ENCOUNTERS,
  monsterById,
  expeditionSeed,
  GAMBLE_STAKE,
  newCombat,
  PLAYER_BASE,
  REGION_CLEAR_KILLS,
  REGIONS,
  regionIndex,
  resolveRound,
  SHRINE_MIN_COST,
} from './quest';
import { createRng } from './rng';
import { tickWorld } from './sim';
import type { AgentState, ItemId, Side, Trade, WorldState } from './types';

/** Rolling GE buy-limit window — a command-layer mechanic (NPCs unaffected). */
export const BUY_LIMIT_WINDOW_TICKS = 4_000;

/** Remaining GE buy allowance for this item in the current window (null = unlimited). */
function buyRemaining(state: WorldState, agent: AgentState, itemId: ItemId): number | null {
  const def = itemDef(state, itemId);
  const limit = def?.buyLimit ?? 0;
  if (limit <= 0) return null;
  const w = agent.buyWindows?.[itemId];
  if (!w || state.tick - w.windowStart >= BUY_LIMIT_WINDOW_TICKS) return limit;
  return Math.max(0, limit - w.bought);
}

export const PROGRESSION = {
  startingSlots: 3,
  maxSlots: 8,
  /** Cost of slot 4, 5, 6, 7, 8 — burned (gp sink), not paid to anyone. */
  slotCosts: [25_000, 75_000, 200_000, 500_000, 1_250_000],
  /** Automation tiers; cost of tier N is costs[N-1]. All burned. */
  upgrades: {
    autoFlip: { costs: [50_000, 150_000, 400_000] },
  },
} as const;

export type UpgradeId = keyof typeof PROGRESSION.upgrades;

export type PlayerCommand =
  | { type: 'place'; itemId: ItemId; side: Side; price: number; qty: number }
  | { type: 'cancel'; itemId?: ItemId; side?: Side }
  | { type: 'buySlot' }
  | { type: 'buyUpgrade'; upgradeId: string }
  | { type: 'configureBot'; maxVolatility?: number; capitalFraction?: number; focusItemId?: ItemId | null }
  | { type: 'fulfillContract'; contractId: number }
  | { type: 'startExpedition'; regionId: string; pack: Record<ItemId, number> }
  | { type: 'advance' }
  | { type: 'fight' }
  | { type: 'fleeCombat' }
  | { type: 'eatFood'; itemId: ItemId }
  | { type: 'choose'; accept: boolean }
  | { type: 'extract' };

export interface CommandResult {
  ok: boolean;
  reason?: string;
  trades: Trade[];
}

export interface MarketView {
  itemId: ItemId;
  lastPrice: number;
  ema: number;
  bestBid: number | null;
  bestAsk: number | null;
  bestBidIsMine: boolean;
  bestAskIsMine: boolean;
  /** Total resting quantity on each side — exit-liquidity signal for bots. */
  bidDepth: number;
  askDepth: number;
  /** GE buy allowance left this window (null = no limit on this item). */
  buyRemaining: number | null;
  volume: number;
}

export interface OpenOrderView {
  id: number;
  itemId: ItemId;
  side: Side;
  price: number;
  remaining: number;
}

export interface PlayerView {
  playerId: number;
  gp: number;
  slots: number;
  /** null when already at max slots. */
  nextSlotCost: number | null;
  /** Purchased automation tiers by upgrade id. */
  upgrades: Record<string, number>;
  /** Clerk Orders — null fields mean "tier default". */
  botConfig: { maxVolatility: number | null; capitalFraction: number | null; focusItemId: ItemId | null };
  /** Open quartermaster contracts (world-public). */
  contracts: { id: number; itemId: ItemId; qty: number; unitPrice: number; expiresTick: number }[];
  inventory: Record<ItemId, number>;
  openOrders: OpenOrderView[];
  markets: MarketView[];
}

/** OSRS rules: keep your 3 most valuable carried UNITS; the rest — and all
 * loot gp — is lost to the depths (burned; it was minted at the kills). */
function expeditionDeath(
  state: WorldState,
  agent: AgentState,
  exp: NonNullable<AgentState['expedition']>,
): void {
  const units: { itemId: ItemId; cost: number }[] = [];
  for (const [itemId, qty] of Object.entries(exp.pack)) {
    const cost = itemDef(state, itemId)?.baseCost ?? 0;
    for (let i = 0; i < qty; i++) units.push({ itemId, cost });
  }
  units.sort((a, b) => b.cost - a.cost || (a.itemId < b.itemId ? -1 : 1));
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (i < 3) agent.inventory[u.itemId] = (agent.inventory[u.itemId] ?? 0) + 1;
    else state.ledger.itemsBurned[u.itemId] = (state.ledger.itemsBurned[u.itemId] ?? 0) + 1;
  }
  state.ledger.gpBurned += exp.packGp;
  agent.hp = 1; // you barely crawled home — rest before diving again
  delete agent.expedition;
}

function playerOf(state: WorldState, playerId: number): AgentState | null {
  const agent = state.agents[playerId];
  if (!agent || agent.id !== playerId || agent.kind !== 'player') return null;
  return agent;
}

function slotsOf(agent: AgentState): number {
  return agent.slots ?? PROGRESSION.startingSlots;
}

export function countOpenOrders(state: WorldState, agentId: number): number {
  let n = 0;
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    for (const o of book.buys) if (o.agentId === agentId) n++;
    for (const o of book.sells) if (o.agentId === agentId) n++;
  }
  return n;
}

export function applyCommand(state: WorldState, playerId: number, cmd: PlayerCommand): CommandResult {
  const agent = state.agents[playerId];
  if (!agent || agent.id !== playerId) return { ok: false, reason: 'unknown-player', trades: [] };
  if (agent.kind !== 'player') return { ok: false, reason: 'not-a-player', trades: [] };

  switch (cmd.type) {
    case 'place': {
      // GE model: submitting an offer requires a free slot, even if it would fill instantly.
      if (countOpenOrders(state, agent.id) >= slotsOf(agent)) {
        return { ok: false, reason: 'no-free-slots', trades: [] };
      }
      if (cmd.side === 'buy') {
        const remaining = buyRemaining(state, agent, cmd.itemId);
        if (remaining !== null && cmd.qty > remaining) {
          return { ok: false, reason: 'buy-limit', trades: [] };
        }
      }
      const res = placeOrder(state, agent, cmd.itemId, cmd.side, cmd.price, cmd.qty);
      if (res.accepted && cmd.side === 'buy') {
        const def = itemDef(state, cmd.itemId);
        if ((def?.buyLimit ?? 0) > 0) {
          // Counted at PLACEMENT, never refunded on cancel — placing an offer
          // reserves your allowance (stricter than OSRS fill-counting; simpler
          // and not gameable by place/cancel churn).
          if (!agent.buyWindows) agent.buyWindows = {};
          const w = agent.buyWindows[cmd.itemId];
          if (!w || state.tick - w.windowStart >= BUY_LIMIT_WINDOW_TICKS) {
            agent.buyWindows[cmd.itemId] = { windowStart: state.tick, bought: cmd.qty };
          } else {
            w.bought += cmd.qty;
          }
        }
      }
      const out: CommandResult = { ok: res.accepted, trades: res.trades };
      if (res.reason !== undefined) out.reason = res.reason;
      return out;
    }
    case 'cancel': {
      cancelAgentOrders(state, agent, cmd.itemId, cmd.side);
      return { ok: true, trades: [] };
    }
    case 'buySlot': {
      const slots = slotsOf(agent);
      const cost = PROGRESSION.slotCosts[slots - PROGRESSION.startingSlots];
      if (cost === undefined || slots >= PROGRESSION.maxSlots) {
        return { ok: false, reason: 'max-slots', trades: [] };
      }
      if (agent.gp < cost) return { ok: false, reason: 'insufficient-gp', trades: [] };
      agent.gp -= cost;
      state.ledger.gpBurned += cost; // unlock gp leaves the world — it's a sink
      agent.slots = slots + 1;
      return { ok: true, trades: [] };
    }
    case 'buyUpgrade': {
      // Object.hasOwn blocks prototype-chain keys ('__proto__', 'constructor')
      // in hostile/malformed commands — indexing those would throw mid-tick.
      if (!Object.hasOwn(PROGRESSION.upgrades, cmd.upgradeId)) {
        return { ok: false, reason: 'unknown-upgrade', trades: [] };
      }
      const def = PROGRESSION.upgrades[cmd.upgradeId as UpgradeId];
      const tier = agent.upgrades?.[cmd.upgradeId] ?? 0;
      const cost = def.costs[tier];
      if (cost === undefined) return { ok: false, reason: 'max-tier', trades: [] };
      if (agent.gp < cost) return { ok: false, reason: 'insufficient-gp', trades: [] };
      agent.gp -= cost;
      state.ledger.gpBurned += cost; // burned, like slots
      if (!agent.upgrades) agent.upgrades = {};
      agent.upgrades[cmd.upgradeId] = tier + 1;
      return { ok: true, trades: [] };
    }
    case 'configureBot': {
      // Clerk Orders: a clamped patch. Runtime still applies tier ceilings —
      // config can only ever make automation MORE conservative than its tier.
      const cfg = { ...(agent.botConfig ?? {}) };
      if (cmd.maxVolatility !== undefined) {
        if (!Number.isFinite(cmd.maxVolatility)) return { ok: false, reason: 'bad-config', trades: [] };
        cfg.maxVolatility = Math.min(1, Math.max(0.01, cmd.maxVolatility));
      }
      if (cmd.capitalFraction !== undefined) {
        if (!Number.isFinite(cmd.capitalFraction)) return { ok: false, reason: 'bad-config', trades: [] };
        cfg.capitalFraction = Math.min(0.5, Math.max(0.1, cmd.capitalFraction));
      }
      if (cmd.focusItemId !== undefined) {
        if (cmd.focusItemId !== null && !state.items.some((i) => i.id === cmd.focusItemId)) {
          return { ok: false, reason: 'unknown-item', trades: [] };
        }
        cfg.focusItemId = cmd.focusItemId;
      }
      agent.botConfig = cfg;
      return { ok: true, trades: [] };
    }
    case 'fulfillContract': {
      const contracts = state.contracts ?? [];
      const idx = contracts.findIndex((c) => c.id === cmd.contractId);
      if (idx === -1) return { ok: false, reason: 'unknown-contract', trades: [] };
      const contract = contracts[idx]!;
      if (contract.expiresTick <= state.tick) return { ok: false, reason: 'contract-expired', trades: [] };
      // Delivery comes from free inventory only — escrowed items don't count.
      if ((agent.inventory[contract.itemId] ?? 0) < contract.qty) {
        return { ok: false, reason: 'insufficient-items', trades: [] };
      }
      agent.inventory[contract.itemId] = (agent.inventory[contract.itemId] ?? 0) - contract.qty;
      state.ledger.itemsBurned[contract.itemId] =
        (state.ledger.itemsBurned[contract.itemId] ?? 0) + contract.qty; // goods leave the world
      const payout = contract.qty * contract.unitPrice;
      agent.gp += payout;
      state.ledger.gpMinted += payout; // the quartermaster's coin is freshly struck
      contracts.splice(idx, 1);
      state.stats.contractsFilled = (state.stats.contractsFilled ?? 0) + 1;
      return { ok: true, trades: [] };
    }
    case 'startExpedition': {
      if (agent.expedition) return { ok: false, reason: 'already-out', trades: [] };
      const idx = regionIndex(cmd.regionId);
      if (idx === -1) return { ok: false, reason: 'unknown-region', trades: [] };
      if (idx > (agent.questProgress ?? 0)) return { ok: false, reason: 'region-locked', trades: [] };
      if (typeof cmd.pack !== 'object' || cmd.pack === null) return { ok: false, reason: 'bad-pack', trades: [] };
      for (const [itemId, qty] of Object.entries(cmd.pack)) {
        if (!Number.isSafeInteger(qty) || qty < 1) return { ok: false, reason: 'bad-pack', trades: [] };
        if ((agent.inventory[itemId] ?? 0) < qty) return { ok: false, reason: 'insufficient-items', trades: [] };
      }
      const pack: Record<ItemId, number> = {};
      for (const [itemId, qty] of Object.entries(cmd.pack)) {
        agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) - qty;
        pack[itemId] = qty;
      }
      const expId = state.nextExpeditionId ?? 1;
      state.nextExpeditionId = expId + 1;
      state.stats.deepestRegion = Math.max(state.stats.deepestRegion ?? 0, idx);
      agent.expedition = {
        regionId: cmd.regionId,
        rngState: expeditionSeed(state.seed, expId),
        // Wounds persist: you set out with the hp you came home with (absent =
        // full). Embarking hurt is allowed — that's the player's gamble.
        hp: Math.min(PLAYER_BASE.maxHp, Math.max(1, agent.hp ?? PLAYER_BASE.maxHp)),
        pack,
        packGp: 0,
        cleared: 0,
        combat: null,
      };
      return { ok: true, trades: [] };
    }
    case 'advance': {
      const exp = agent.expedition;
      if (!exp) return { ok: false, reason: 'not-out', trades: [] };
      if (exp.combat) return { ok: false, reason: 'in-combat', trades: [] };
      if (exp.event) return { ok: false, reason: 'in-event', trades: [] };
      // The trek costs time: each step forward advances the world one tick,
      // so a sprint's grind is bounded by the same clock the market runs on
      // (without this, score scales with raw command spam — FINDINGS #45).
      // Safe in replay: recorded ticks fully determine application order.
      tickWorld(state);
      const region = REGIONS[regionIndex(exp.regionId)]!;
      const rng = createRng(exp.rngState);
      const roll = rng.next();
      const journal = (exp.journal ??= []);
      if (roll < ENCOUNTERS.monster) {
        const rIdx = regionIndex(exp.regionId);
        if (rIdx === REGIONS.length - 1 && rng.chance(ELITE_CHANCE)) {
          exp.combat = newCombat('vorkanth', exp.hp, 'the ground shakes — VORKANTH, ELDER OF THE MAW, descends!');
        } else if (rIdx < REGIONS.length - 1 && rng.chance(AMBUSH_CHANCE)) {
          const deeper = REGIONS[rIdx + 1]!;
          const beast = rng.pick(deeper.monsters);
          exp.combat = newCombat(beast, exp.hp, `AMBUSH — a ${monsterById(beast).name} from ${deeper.name} crosses your path!`);
        } else {
          exp.combat = newCombat(rng.pick(region.monsters), exp.hp);
        }
      } else if (roll < ENCOUNTERS.monster + ENCOUNTERS.cache) {
        // A stash in the dark — coin, and sometimes goods (minted like drops).
        const rIdx = regionIndex(exp.regionId);
        const found = rng.int(20, 60 + 40 * rIdx);
        state.ledger.gpMinted += found;
        exp.packGp += found;
        state.stats.cacheFinds = (state.stats.cacheFinds ?? 0) + 1;
        if (rng.chance(CACHE_ITEM_CHANCE)) {
          const itemId = rng.pick(cachePool(rIdx));
          state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
          exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
          journal.push(`you pry open a forgotten cache: +${found} gp and a ${itemId.replace(/_/g, ' ')}`);
        } else {
          journal.push(`you pry open a forgotten cache: +${found} gp`);
        }
      } else if (roll < ENCOUNTERS.monster + ENCOUNTERS.cache + ENCOUNTERS.trap) {
        const dmg = rng.int(3, 6 + 3 * regionIndex(exp.regionId));
        exp.hp -= dmg;
        journal.push(`a snare bites — ${dmg} hp`);
        if (exp.hp <= 0) {
          journal.push('the trap was the last thing you never saw');
          expeditionDeath(state, agent, exp);
        }
      } else if (rng.chance(0.5)) {
        exp.event = { kind: 'shrine', prompt: 'a shrine hums in the dark — tithe a quarter of your loot gp for full healing?' };
      } else {
        exp.event = { kind: 'gamble', prompt: `a goblin rattles a cup of dice — stake ${GAMBLE_STAKE} loot gp, double or nothing?` };
      }
      exp.rngState = rng.state();
      return { ok: true, trades: [] };
    }
    case 'choose': {
      const exp = agent.expedition;
      if (!exp || !exp.event) return { ok: false, reason: 'no-event', trades: [] };
      const ev = exp.event;
      const rng = createRng(exp.rngState);
      const journal = (exp.journal ??= []);
      if (!cmd.accept) {
        journal.push('you walk on');
      } else if (ev.kind === 'shrine') {
        const cost = Math.max(SHRINE_MIN_COST, Math.floor(exp.packGp / 4));
        if (exp.packGp < cost) {
          journal.push('the shrine finds your offering wanting');
        } else {
          exp.packGp -= cost;
          state.ledger.gpBurned += cost; // the gods bank elsewhere
          exp.hp = PLAYER_BASE.maxHp;
          journal.push(`the shrine takes ${cost} gp and knits your wounds`);
        }
      } else {
        if (exp.packGp < GAMBLE_STAKE) {
          journal.push('the goblin counts your purse and laughs');
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
    case 'fight':
    case 'fleeCombat':
    case 'eatFood': {
      const exp = agent.expedition;
      if (!exp || !exp.combat) return { ok: false, reason: 'not-in-combat', trades: [] };
      let action: import('./quest').CombatAction;
      if (cmd.type === 'fight') action = { kind: 'fight' };
      else if (cmd.type === 'fleeCombat') action = { kind: 'flee' };
      else {
        if (!CONSUMABLES[cmd.itemId]) return { ok: false, reason: 'not-edible', trades: [] };
        if ((exp.pack[cmd.itemId] ?? 0) < 1) return { ok: false, reason: 'insufficient-items', trades: [] };
        action = { kind: 'eat', itemId: cmd.itemId };
      }
      // A combat round costs a world tick too — otherwise loot scales with
      // command spam, not sprint time (same lever as 'advance', FINDINGS #45).
      tickWorld(state);
      if (action.kind === 'eat') {
        exp.pack[action.itemId] = exp.pack[action.itemId]! - 1;
        state.ledger.itemsBurned[action.itemId] = (state.ledger.itemsBurned[action.itemId] ?? 0) + 1;
      }
      const rng = createRng(exp.rngState);
      resolveRound(exp.combat, deriveStats(exp.pack), action, rng);
      exp.rngState = rng.state();
      const c = exp.combat;
      if (c.outcome === 'won') {
        state.ledger.gpMinted += c.lootGp; // monster coin is freshly struck
        exp.packGp += c.lootGp;
        for (const itemId of c.lootItems) {
          state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
          exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
        }
        exp.cleared += 1;
        exp.hp = c.playerHp;
        state.stats.monstersSlain = (state.stats.monstersSlain ?? 0) + 1;
        if (monsterById(c.monsterId).elite) {
          state.stats.eliteSlain = (state.stats.eliteSlain ?? 0) + 1;
        }
        const idx = regionIndex(exp.regionId);
        if (exp.cleared >= REGION_CLEAR_KILLS && idx === (agent.questProgress ?? 0) && idx < REGIONS.length - 1) {
          agent.questProgress = idx + 1; // the frontier moves
        }
        exp.combat = null;
      } else if (c.outcome === 'dead') {
        expeditionDeath(state, agent, exp);
      } else if (c.outcome === 'fled') {
        exp.hp = c.playerHp;
        exp.combat = null; // escaped this encounter — no kill credit
      }
      return { ok: true, trades: [] };
    }
    case 'extract': {
      const exp = agent.expedition;
      if (!exp) return { ok: false, reason: 'not-out', trades: [] };
      if (exp.combat) return { ok: false, reason: 'in-combat', trades: [] };
      for (const [itemId, qty] of Object.entries(exp.pack)) {
        if (qty > 0) agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) + qty;
      }
      agent.gp += exp.packGp; // already minted at each kill
      // Wounds come home with you; full health drops the field (canonical
      // absent-= -full form keeps never-hurt saves byte-identical).
      if (exp.hp < PLAYER_BASE.maxHp) agent.hp = Math.max(1, exp.hp);
      else delete agent.hp;
      delete agent.expedition;
      return { ok: true, trades: [] };
    }
  }
}

export function playerView(state: WorldState, playerId: number): PlayerView | null {
  const agent = playerOf(state, playerId);
  if (!agent) return null;
  const slots = slotsOf(agent);
  const openOrders: OpenOrderView[] = [];
  const markets: MarketView[] = [];
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
      bestBidIsMine: bid !== undefined && bid.agentId === agent.id,
      bestAskIsMine: ask !== undefined && ask.agentId === agent.id,
      bidDepth,
      askDepth,
      buyRemaining: buyRemaining(state, agent, def.id),
      volume: book.volume,
    });
  }
  return {
    playerId: agent.id,
    gp: agent.gp,
    slots,
    nextSlotCost: PROGRESSION.slotCosts[slots - PROGRESSION.startingSlots] ?? null,
    upgrades: { ...(agent.upgrades ?? {}) },
    botConfig: {
      maxVolatility: agent.botConfig?.maxVolatility ?? null,
      capitalFraction: agent.botConfig?.capitalFraction ?? null,
      focusItemId: agent.botConfig?.focusItemId ?? null,
    },
    contracts: (state.contracts ?? [])
      .filter((c) => c.expiresTick > state.tick)
      .map((c) => ({ id: c.id, itemId: c.itemId, qty: c.qty, unitPrice: c.unitPrice, expiresTick: c.expiresTick })),
    inventory: { ...agent.inventory },
    openOrders,
    markets,
  };
}
