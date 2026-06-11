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
  /** OSRS item id when the catalog is wiki-generated (icons live at icons/{wikiId}.png). */
  wikiId?: number;
  /** Real GE mid price at snapshot time (display/reference only). */
  wikiPrice?: number;
  /** Real GE buy limit (display only for now — mechanic queued). */
  buyLimit?: number;
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
  /** Players only: 'scripted-flipper' (active bot) or 'idle' (engine automation only). */
  policy?: string;
  /** Players only: purchased automation tiers by upgrade id (see PROGRESSION.upgrades). */
  upgrades?: Record<string, number>;
  /** Players only: idle-bot configuration set via the configureBot command. */
  botConfig?: { maxVolatility?: number; capitalFraction?: number; focusItemId?: ItemId | null };
  /** Players only: rolling GE buy-limit windows per item (absent = fresh). */
  buyWindows?: Record<ItemId, { windowStart: number; bought: number }>;
  /** Players only: the expedition in progress (shape in quest.ts; plain JSON). */
  expedition?: import('./quest').ExpeditionState;
  /** Players only: highest region index unlocked (absent = 0, the plains). */
  questProgress?: number;
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
  eventsSpawned: number;
  contractsFilled: number;
}

/** A standing NPC buy-order at a premium — the realm's quartermaster pays
 * via ledger mint; delivered items leave the world via ledger burn. */
export interface Contract {
  id: number;
  itemId: ItemId;
  qty: number;
  unitPrice: number;
  expiresTick: number;
}

/** A temporary, seeded market shock. Effects apply only through the normal
 * producer/consumer mint-burn paths — conservation holds through any event. */
export interface WorldEvent {
  id: string;
  itemId: ItemId;
  kind: 'supply_shock' | 'demand_surge' | 'supply_glut' | 'demand_slump';
  startTick: number;
  endTick: number;
}

export const EVENT_LABELS: Record<WorldEvent['kind'], string> = {
  supply_shock: 'shortage',
  demand_surge: 'craze',
  supply_glut: 'glut',
  demand_slump: 'slump',
};

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
  /** Active market events (pruned on spawn checks). Absent in pre-event saves. */
  events?: WorldEvent[];
  /** Open quartermaster contracts. Absent in pre-contract saves. */
  contracts?: Contract[];
  nextContractId?: number;
  /** Expedition counter — seeds each expedition's private RNG stream.
   * Appears on first use (pre-quest saves stay byte-identical). */
  nextExpeditionId?: number;
  ledger: Ledger;
  stats: SimStats;
}
