// Game bootstrap + persistence. The human is an idle-policy player agent:
// engine-inert unless automation is purchased, acting only via UI commands.
import { addAgent, createWorld, EVENT_LABELS, playerView, runTicks } from '@exchange-wars/engine';
import type { PlayerView, WorldEvent, WorldState } from '@exchange-wars/engine';

export interface Game {
  world: WorldState;
  playerId: number;
  /** What the human started with — session profit is measured against this. */
  startGp: number;
  /** Throttled net-worth samples for the Fortune chart (persisted). */
  worthHistory: { tick: number; worth: number }[];
  /** Wall-clock ms at last save — drives offline accrual on reopen. */
  lastSeenMs?: number;
  /** Latched milestone ids (persisted; never un-latch). */
  milestones: string[];
  /** The Chronicle: event begin/end headlines (capped, persisted). */
  newsLog: NewsEntry[];
  /** Events we've already headlined (so endings can be detected). */
  seenEvents: { id: string; itemId: string; kind: WorldEvent['kind']; startPrice?: number }[];
  /** Personal fill history, latched from the rolling trades window (capped). */
  fills: Fill[];
  /** Trades-window scan cursor for fill latching. */
  fillScanTick: number;
  /** Your best previous run on THIS seed — raced as a dim line on the
   * Fortune chart. Determinism makes it a fair ghost. */
  ghost?: GhostRun;
}

export interface GhostRun {
  seed: number;
  history: { tick: number; worth: number }[];
}

/** Offline ticks as human time (1 tick ≡ 1 real second while away). */
export function fmtDuration(ticks: number): string {
  if (ticks >= 3_600) {
    const h = Math.floor(ticks / 3_600);
    const m = Math.floor((ticks % 3_600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (ticks >= 60) return `${Math.floor(ticks / 60)}m`;
  return `${ticks}s`;
}

/** Parse a `#seed=N` challenge fragment (the "race a friend" link). */
export function parseChallengeSeed(hash: string): number | null {
  const m = /^#seed=(\d{1,10})$/.exec(hash);
  if (!m) return null;
  const seed = Number(m[1]);
  return Number.isSafeInteger(seed) ? seed : null;
}

/**
 * Restarting the SAME seed keeps your best previous run as a chart ghost
 * (best = highest final worth, comparing the run being abandoned against any
 * ghost it was itself racing). Different seed → no ghost.
 */
export function ghostForRestart(prev: Game, seed: number): GhostRun | undefined {
  if (prev.world.seed !== seed) return undefined;
  const candidates: GhostRun[] = [];
  if (prev.worthHistory.length >= 2) candidates.push({ seed, history: prev.worthHistory });
  if (prev.ghost && prev.ghost.seed === seed) candidates.push(prev.ghost);
  if (candidates.length === 0) return undefined;
  candidates.sort(
    (a, b) =>
      (b.history[b.history.length - 1]?.worth ?? 0) - (a.history[a.history.length - 1]?.worth ?? 0),
  );
  return candidates[0];
}

export interface Fill {
  tick: number;
  itemId: string;
  side: 'buy' | 'sell';
  qty: number;
  price: number;
}

const FILLS_CAP = 50;

/** Latch the player's fills out of the rolling trades window. */
export function recordFills(game: Game): void {
  const trades = game.world.trades;
  const tail = game.fills.slice(-20);
  for (const t of trades) {
    if (t.tick < game.fillScanTick) continue;
    const isBuy = t.buyerId === game.playerId;
    const isSell = t.sellerId === game.playerId;
    if (!isBuy && !isSell) continue;
    const fill: Fill = { tick: t.tick, itemId: t.itemId, side: isBuy ? 'buy' : 'sell', qty: t.qty, price: t.price };
    // Same-tick rescans can revisit trades — dedupe against the recent tail.
    if (
      tail.some(
        (f) =>
          f.tick === fill.tick &&
          f.itemId === fill.itemId &&
          f.side === fill.side &&
          f.qty === fill.qty &&
          f.price === fill.price,
      )
    ) {
      continue;
    }
    game.fills.push(fill);
    tail.push(fill);
  }
  game.fillScanTick = game.world.tick;
  if (game.fills.length > FILLS_CAP) game.fills.splice(0, game.fills.length - FILLS_CAP);
}

export interface NewsEntry {
  tick: number;
  text: string;
  kind: WorldEvent['kind'] | 'ended';
  /** Endings only: % EMA move over the event's life. Absent on pre-outcome saves. */
  move?: number;
}

const NEWS_CAP = 12;

/** Detect event begins/ends since the last check and append headlines. */
export function updateNews(game: Game): void {
  const tick = game.world.tick;
  const names = new Map(game.world.items.map((i) => [i.id, i.name]));
  const active = (game.world.events ?? []).filter((e) => e.startTick <= tick && e.endTick > tick);
  for (const e of active) {
    if (!game.seenEvents.some((s) => s.id === e.id)) {
      const seen: Game['seenEvents'][number] = { id: e.id, itemId: e.itemId, kind: e.kind };
      const startEma = game.world.books[e.itemId]?.ema;
      if (startEma !== undefined) seen.startPrice = startEma;
      game.seenEvents.push(seen);
      game.newsLog.push({ tick, text: `${names.get(e.itemId) ?? e.itemId} ${EVENT_LABELS[e.kind]} begins`, kind: e.kind });
    }
  }
  for (let i = game.seenEvents.length - 1; i >= 0; i--) {
    const s = game.seenEvents[i]!;
    if (!active.some((e) => e.id === s.id)) {
      game.seenEvents.splice(i, 1);
      const entry: NewsEntry = { tick, text: `${names.get(s.itemId) ?? s.itemId} ${EVENT_LABELS[s.kind]} ends`, kind: 'ended' };
      const endPrice = game.world.books[s.itemId]?.ema;
      if (s.startPrice && s.startPrice > 0 && endPrice !== undefined) {
        entry.move = Math.round(((endPrice - s.startPrice) / s.startPrice) * 100);
      }
      game.newsLog.push(entry);
    }
  }
  if (game.newsLog.length > NEWS_CAP) game.newsLog.splice(0, game.newsLog.length - NEWS_CAP);
}

export interface Milestone {
  id: string;
  name: string;
  flavor: string;
  achieved: (game: Game, view: PlayerView, worth: number) => boolean;
  /** Optional 0..1 progress toward the deed (shown on locked entries). */
  progress?: (game: Game, view: PlayerView, worth: number) => number;
}

export const MILESTONES: Milestone[] = [
  {
    id: 'first-offer',
    name: 'Open for Business',
    flavor: 'Your first offer rests on the books.',
    achieved: (_g, view) => view.openOrders.length > 0,
  },
  {
    id: 'first-goods',
    name: 'Goods in the Satchel',
    flavor: 'You hold actual merchandise.',
    achieved: (_g, view) => Object.values(view.inventory).some((q) => q > 0),
  },
  {
    id: 'hundred-k',
    name: 'Six Figures',
    flavor: 'The satchel jingles differently now.',
    achieved: (_g, _v, worth) => worth >= 100_000,
    progress: (_g, _v, worth) => worth / 100_000,
  },
  {
    id: 'doubled',
    name: 'Doubled Up',
    flavor: 'Twice what you walked in with.',
    achieved: (g, _v, worth) => worth >= g.startGp * 2,
    progress: (g, _v, worth) => worth / (g.startGp * 2),
  },
  {
    id: 'quarter-m',
    name: 'Merchant Prince',
    flavor: 'Clerks nod when you pass.',
    achieved: (_g, _v, worth) => worth >= 250_000,
    progress: (_g, _v, worth) => worth / 250_000,
  },
  {
    id: 'millionaire',
    name: 'gp Millionaire',
    flavor: 'The ledger needs wider columns.',
    achieved: (_g, _v, worth) => worth >= 1_000_000,
    progress: (_g, _v, worth) => worth / 1_000_000,
  },
  {
    id: 'five-million',
    name: 'Gold Baron',
    flavor: 'Five million. The vault groans.',
    achieved: (_g, _v, worth) => worth >= 5_000_000,
    progress: (_g, _v, worth) => worth / 5_000_000,
  },
  {
    id: 'full-counter',
    name: 'Full Counter',
    flavor: 'Every offer slot, bought and paid for.',
    achieved: (_g, view) => view.slots >= 8,
  },
  {
    id: 'hired-help',
    name: 'Hired Help',
    flavor: 'The clerk flips while you sleep.',
    achieved: (_g, view) => (view.upgrades['autoFlip'] ?? 0) >= 1,
  },
  {
    id: 'master-clerk',
    name: 'Master Clerk',
    flavor: 'Tier three. The counter runs itself.',
    achieved: (_g, view) => (view.upgrades['autoFlip'] ?? 0) >= 3,
  },
  {
    id: 'contractor',
    name: 'Royal Contractor',
    flavor: 'The quartermaster pays in full.',
    achieved: (g) => (g.world.stats.contractsFilled ?? 0) > 0,
  },
  {
    id: 'cornered',
    name: 'Market Corner',
    flavor: 'More than half of everything there is.',
    achieved: (g, view) => {
      const ledger = g.world.ledger;
      for (const item of g.world.items) {
        const sellEscrow = view.openOrders
          .filter((o) => o.itemId === item.id && o.side === 'sell')
          .reduce((a, o) => a + o.remaining, 0);
        const held = (view.inventory[item.id] ?? 0) + sellEscrow;
        if (held < 25) continue; // no trivial corners
        const circulating =
          (ledger.itemsInitial[item.id] ?? 0) +
          (ledger.itemsMinted[item.id] ?? 0) -
          (ledger.itemsBurned[item.id] ?? 0);
        if (circulating > 0 && held / circulating >= 0.5) return true;
      }
      return false;
    },
  },
  {
    id: 'exotic-taste',
    name: 'Exotic Taste',
    flavor: 'Rare goods in the satchel — the dangerous kind.',
    // Exotic = the wiki generator's high-volatility track (vol >= 0.13).
    achieved: (g, view) =>
      g.world.items.some((i) => i.volatility >= 0.13 && (view.inventory[i.id] ?? 0) > 0),
  },
  {
    id: 'master-contractor',
    name: 'Quartermaster General',
    flavor: 'Ten royal contracts, sealed and delivered.',
    achieved: (g) => (g.world.stats.contractsFilled ?? 0) >= 10,
    progress: (g) => (g.world.stats.contractsFilled ?? 0) / 10,
  },
  {
    id: 'big-leagues',
    name: 'Big Leagues',
    flavor: 'A heavyweight flip — the senior clerks nod.',
    // A fill in the big-staple band (the ladder's 0.12 tier — ≥5k-gp goods).
    achieved: (g) =>
      g.fills.some((f) => {
        const v = g.world.items.find((i) => i.id === f.itemId)?.volatility ?? 0;
        return v >= 0.12 && v < 0.13;
      }),
  },
  {
    id: 'storm-rider',
    name: 'Storm Trader',
    flavor: 'You traded into the storm and lived.',
    // A personal fill inside an event's window. Clerks refuse event items,
    // so only live human play can earn this; events prune ~250 ticks after
    // ending and checkMilestones runs every refresh — reliable in practice.
    achieved: (g) =>
      g.fills.some((f) =>
        (g.world.events ?? []).some(
          (e) => e.itemId === f.itemId && e.startTick <= f.tick && f.tick < e.endTick,
        ),
      ),
  },
];

/** Latch any newly-achieved milestones into the save; returns just the new ones. */
export function checkMilestones(game: Game, view: PlayerView, worth: number): Milestone[] {
  const newly: Milestone[] = [];
  for (const m of MILESTONES) {
    if (game.milestones.includes(m.id)) continue;
    if (m.achieved(game, view, worth)) {
      game.milestones.push(m.id);
      newly.push(m);
    }
  }
  return newly;
}

/** Liquid net worth from the view: gp + inventory and open orders at last price. */
export function viewNetWorth(view: PlayerView): number {
  const last = new Map(view.markets.map((m) => [m.itemId, m.lastPrice]));
  let total = view.gp;
  for (const [id, qty] of Object.entries(view.inventory)) total += qty * (last.get(id) ?? 0);
  for (const o of view.openOrders) {
    total += o.side === 'buy' ? o.price * o.remaining : o.remaining * (last.get(o.itemId) ?? 0);
  }
  return total;
}

const SAMPLE_EVERY_TICKS = 50;
const SAMPLE_CAP = 240;

/** Record a net-worth sample if enough ticks have passed since the last one. */
export function recordWorth(game: Game, worth: number): void {
  const h = game.worthHistory;
  const last = h.length > 0 ? h[h.length - 1]!.tick : Number.NEGATIVE_INFINITY;
  if (game.world.tick - last < SAMPLE_EVERY_TICKS) return;
  h.push({ tick: game.world.tick, worth });
  if (h.length > SAMPLE_CAP) h.splice(0, h.length - SAMPLE_CAP);
}

export const SAVE_KEY = 'exchange-wars-save-v1';
export const HUMAN_START_GP = 55_000;

export function newGame(seed: number): Game {
  const world = createWorld({ seed });
  const human = addAgent(world, 'player', HUMAN_START_GP, {});
  human.policy = 'idle';
  return {
    world,
    playerId: human.id,
    startGp: HUMAN_START_GP,
    worthHistory: [{ tick: 0, worth: HUMAN_START_GP }],
    milestones: [],
    newsLog: [],
    seenEvents: [],
    fills: [],
    fillScanTick: 0,
  };
}

export const OFFLINE_TPS = 1;
export const OFFLINE_CAP_TICKS = 100_000; // ~28h at 1 tps — a full day away still pays
const OFFLINE_MIN_TICKS = 60; // ignore sub-minute blips (tab switches, reloads)

export interface OfflineResult {
  ticks: number;
  worthBefore: number;
  worthAfter: number;
}

export interface OfflinePlan {
  ticks: number;
  worthBefore: number;
}

/**
 * Plan an offline catch-up WITHOUT running it (restamps lastSeenMs). The UI
 * runs big plans in chunks behind an overlay — 100k ticks at 100 items is
 * ~14s, far too long to block the main thread on tab open.
 */
export function planOfflineProgress(game: Game, nowMs: number): OfflinePlan | null {
  const last = game.lastSeenMs;
  game.lastSeenMs = nowMs;
  if (last === undefined || nowMs <= last) return null;
  const ticks = Math.min(OFFLINE_CAP_TICKS, Math.floor(((nowMs - last) / 1000) * OFFLINE_TPS));
  if (ticks < OFFLINE_MIN_TICKS) return null;
  const before = playerView(game.world, game.playerId);
  if (!before) return null;
  return { ticks, worthBefore: viewNetWorth(before) };
}

/** Close out a plan after its ticks have run (however they were chunked). */
export function finishOfflineProgress(game: Game, plan: OfflinePlan): OfflineResult {
  const after = playerView(game.world, game.playerId);
  const worthAfter = after ? viewNetWorth(after) : plan.worthBefore;
  recordWorth(game, worthAfter);
  return { ticks: plan.ticks, worthBefore: plan.worthBefore, worthAfter };
}

/**
 * The idle-game contract: real time away advances the world at OFFLINE_TPS,
 * capped. Clock is injected so this stays unit-testable. Mutates the game
 * (fast-forwards + restamps lastSeenMs); returns null when nothing applied.
 * Synchronous composition of plan/finish — the UI chunks big plans itself.
 */
export function applyOfflineProgress(game: Game, nowMs: number): OfflineResult | null {
  const plan = planOfflineProgress(game, nowMs);
  if (!plan) return null;
  runTicks(game.world, plan.ticks);
  return finishOfflineProgress(game, plan);
}

export function saveGame(game: Game): void {
  game.lastSeenMs = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
}

/** Default fields that predate older save formats (local OR cloud saves). */
export function normalizeGame(game: Game): Game {
  return {
    ...game,
    startGp: game.startGp ?? HUMAN_START_GP,
    worthHistory: game.worthHistory ?? [],
    milestones: game.milestones ?? [],
    newsLog: game.newsLog ?? [],
    seenEvents: game.seenEvents ?? [],
    fills: game.fills ?? [],
    fillScanTick: game.fillScanTick ?? 0,
  };
}

export function exportSaveString(game: Game): string {
  return JSON.stringify(game);
}

export function importSaveString(raw: string): Game | null {
  try {
    const g = JSON.parse(raw) as Game;
    if (!g || typeof g !== 'object' || !g.world || typeof g.playerId !== 'number') return null;
    return normalizeGame(g);
  } catch {
    return null;
  }
}

export function loadGame(): Game | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    return normalizeGame(JSON.parse(raw) as Game);
  } catch {
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}
