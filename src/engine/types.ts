// World state must stay plain JSON: no classes, no functions, no Map/Set,
// no undefined-valued properties. JSON.parse(JSON.stringify(state)) must
// round-trip to an identical state hash (enforced by test/determinism.test.ts).

export type ItemId = string;
export type Side = 'buy' | 'sell';

export interface ItemDef {
  id: ItemId;
  name: string;
  /** Producer unit cost — soft price floor. */
  baseCost: number;
  /** Consumer reservation price — soft price ceiling. */
  consumeValue: number;
  /** 0..1 — scale of noise-trader price perturbation. */
  volatility: number;
}

export interface Order {
  id: number;
  /** Tick the order was placed (price-time priority tiebreaker). */
  tick: number;
  agentId: number;
  itemId: ItemId;
  side: Side;
  price: number;
  qty: number;
  remaining: number;
  /** Buy orders only: gp locked. Invariant while resting: price * remaining. */
  escrowGp: number;
}

export interface Trade {
  tick: number;
  itemId: ItemId;
  price: number;
  qty: number;
  buyerId: number;
  sellerId: number;
}

export type AgentKind = 'producer' | 'consumer' | 'marketMaker' | 'momentum' | 'noise' | 'player';

export interface AgentState {
  id: number;
  kind: AgentKind;
  gp: number;
  inventory: Record<ItemId, number>;
  /** Producers/consumers/market-makers specialise in one item. */
  itemId?: ItemId;
  /** Players only: GE-style offer slot count (see PROGRESSION in commands.ts). */
  slots?: number;
  /** Strategy scratch space — JSON-serializable numbers only. */
  memo: Record<string, number>;
}

export interface OrderBook {
  itemId: ItemId;
  /** Sorted: price desc, then tick asc, then id asc. */
  buys: Order[];
  /** Sorted: price asc, then tick asc, then id asc. */
  sells: Order[];
  lastPrice: number;
  /** Slow EMA of trade prices (alpha 0.05). */
  ema: number;
  /** Cumulative quantity traded. */
  volume: number;
}

/** Explicit mint/burn accounting so conservation is testable, not assumed. */
export interface Ledger {
  gpInitial: number;
  gpMinted: number;
  gpBurned: number;
  itemsInitial: Record<ItemId, number>;
  itemsMinted: Record<ItemId, number>;
  itemsBurned: Record<ItemId, number>;
}

export interface SimStats {
  tradesTotal: number;
  ordersPlaced: number;
  ordersRejected: number;
  ordersCancelled: number;
  /** Times a near-broke noise/momentum trader was topped up (ledger-minted). */
  npcBailouts: number;
}

export interface WorldState {
  tick: number;
  seed: number;
  /** RNG cursor — advancing the sim mutates this, so snapshots resume exactly. */
  rngState: number;
  nextOrderId: number;
  items: ItemDef[];
  agents: AgentState[];
  books: Record<ItemId, OrderBook>;
  /** Recent trades window (capped); cumulative counts live in stats. */
  trades: Trade[];
  ledger: Ledger;
  stats: SimStats;
}
