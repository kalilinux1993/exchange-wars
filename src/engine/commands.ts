// The player surface. Bots, the future UI, and the future server all drive a
// player EXCLUSIVELY through applyCommand + playerView — never the internals.
// Everything in and out is plain JSON (null, never undefined in views).
import { bestAsk, bestBid, cancelAgentOrders, placeOrder } from './exchange';
import type { AgentState, ItemId, Side, Trade, WorldState } from './types';

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
  | { type: 'buyUpgrade'; upgradeId: string };

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
  inventory: Record<ItemId, number>;
  openOrders: OpenOrderView[];
  markets: MarketView[];
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
      const res = placeOrder(state, agent, cmd.itemId, cmd.side, cmd.price, cmd.qty);
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
    for (const o of book.buys) {
      if (o.agentId === agent.id) {
        openOrders.push({ id: o.id, itemId: o.itemId, side: o.side, price: o.price, remaining: o.remaining });
      }
    }
    for (const o of book.sells) {
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
      volume: book.volume,
    });
  }
  return {
    playerId: agent.id,
    gp: agent.gp,
    slots,
    nextSlotCost: PROGRESSION.slotCosts[slots - PROGRESSION.startingSlots] ?? null,
    upgrades: { ...(agent.upgrades ?? {}) },
    inventory: { ...agent.inventory },
    openOrders,
    markets,
  };
}
