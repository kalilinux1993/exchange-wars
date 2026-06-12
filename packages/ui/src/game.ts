// Game bootstrap + persistence. The human is an idle-policy player agent:
// engine-inert unless automation is purchased, acting only via UI commands.
import { addAgent, createWorld, EVENT_LABELS, GE_TAX_RATE, levelsOf, MONSTERS, netWorth, playerView, runTicks } from '@exchange-wars/engine';
import type { PlayerView, RunLogEntry, WorldEvent, WorldState } from '@exchange-wars/engine';

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
  /** World tick each milestone was earned (optional; absent on old saves). */
  milestoneTicks?: Record<string, number>;
  /** The Delve Log: a capped chronicle of completed expeditions (optional; old
   * saves predate it). Persisted, survives the dive the engine's exp state can't. */
  delves?: DelveRecord[];
  /** The Chronicle: event begin/end headlines (capped, persisted). */
  newsLog: NewsEntry[];
  /** Events we've already headlined (so endings can be detected). */
  seenEvents: { id: string; itemId: string; kind: WorldEvent['kind']; startPrice?: number }[];
  /** Personal fill history, latched from the rolling trades window (capped). */
  fills: Fill[];
  /** Trades-window scan cursor for fill latching. */
  fillScanTick: number;
  /** Lifetime trade book (FIFO lots + realized P&L), accrued fill-by-fill so
   * P&L survives the capped fills window. Plain JSON; rebuilt from fills on old
   * saves. */
  tradeBook: TradeBook;
  /** Your best previous run on THIS seed — raced as a dim line on the
   * Fortune chart. Determinism makes it a fair ghost. */
  ghost?: GhostRun;
  /** Every human command with its tick — the run is REPLAYABLE from seed +
   * this log (engine replayRun), which is what verified leaderboards check. */
  commandLog: RunLogEntry[];
  /** Tick since which the log is complete. Only 0 is provable: saves that
   * predate command recording normalize to their current tick and can play
   * on but can't compete. */
  logSince: number;
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
 * Today's shared seed (UTC), so everyone racing "the daily" plays the same world.
 * UI-only — derived from the wall clock, which the deterministic engine never touches.
 * Format YYYYMMDD as an integer (e.g. 2026-06-11 -> 20260611).
 */
export function dailySeed(now = new Date()): number {
  return now.getUTCFullYear() * 10_000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
}

/** A localStorage-only daily-streak record (UI nicety, never touches the engine). */
export interface DailyStreak {
  /** consecutive daily worlds played, ending on `lastDay` */
  count: number;
  /** the dailySeed() value (YYYYMMDD) of the most recent daily played */
  lastDay: number;
  /** best streak ever reached */
  best: number;
}

/**
 * Calendar-day span between two YYYYMMDD daily seeds. Goes through UTC so it's
 * correct across month/year rollover (20260601 - 20260531 == 1 day, not 70).
 */
function streakDaySpan(a: number, b: number): number {
  const toUTC = (s: number): number =>
    Date.UTC(Math.floor(s / 10_000), (Math.floor(s / 100) % 100) - 1, s % 100);
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

/**
 * Advance the daily streak for `today` (a dailySeed() value). Pure: the caller
 * passes today's seed so this never reads the clock. Same day → unchanged
 * (idempotent — safe to call on every render while on the daily); exactly the
 * next day → +1; any other gap (skipped a day, or first ever) → reset to 1.
 * Returns the SAME reference when nothing changed so callers can skip the write.
 */
export function bumpStreak(prev: DailyStreak | null, today: number): DailyStreak {
  if (prev && prev.lastDay === today) return prev;
  const continues = prev !== null && streakDaySpan(prev.lastDay, today) === 1;
  const count = continues ? prev!.count + 1 : 1;
  const best = Math.max(prev?.best ?? 0, count);
  return { count, lastDay: today, best };
}

/**
 * True when a live streak is one day from breaking: last played *exactly*
 * yesterday (span 1) and not yet continued `today`. Already-played-today
 * (span 0) is safe; a 2+ day gap is already dead. Drives the "keep your
 * streak" nudge — the FOMO half of the loop, shown when you're NOT on the daily.
 */
export function streakAtRisk(streak: DailyStreak | null, today: number): boolean {
  return streak !== null && streakDaySpan(streak.lastDay, today) === 1;
}

/** A localStorage-only per-day high score: the best net worth reached on one daily seed. */
export interface DailyBest {
  /** the dailySeed() value (YYYYMMDD) this record belongs to */
  day: number;
  /** highest net worth reached while playing that day's daily */
  best: number;
}

/**
 * Track the best net worth on `today`'s daily. Pure: the caller passes today's
 * seed and the current worth. A new day (or first ever) starts the record at the
 * current worth; the same day keeps the running max. Returns the SAME reference
 * when the record didn't move — worth changes most ticks but a new high is rare,
 * so the caller can skip the localStorage write (mirrors bumpStreak's contract).
 */
export function recordDailyBest(prev: DailyBest | null, today: number, worth: number): DailyBest {
  if (prev && prev.day === today) return worth > prev.best ? { day: today, best: worth } : prev;
  return { day: today, best: worth };
}

/**
 * Display decision for the daily-best tag, kept pure so "when to show + are we at
 * a new peak" is tested, not buried in JSX. Hidden (null) off the record's day or
 * before any real progress (best ≤ where you started — no baseline noise). When
 * shown, `atPeak` is true while current worth is at/above the stored best — i.e.
 * you're setting a new record right now.
 */
export function dailyBestView(
  best: DailyBest | null,
  today: number,
  worth: number,
  startGp: number,
): { best: number; atPeak: boolean } | null {
  if (!best || best.day !== today || best.best <= startGp) return null;
  return { best: best.best, atPeak: worth >= best.best };
}

/**
 * Clamp a row cursor when walking a list with j/k (or ↑/↓). `cur` may be -1 (the
 * selected row isn't in the displayed/filtered list) — moving from there lands on
 * the first row either direction. Clamps at both ends (no wrap, so the list has a
 * stable top and bottom). -1 when there are no rows. Pure.
 */
export function nextRowIndex(cur: number, delta: number, len: number): number {
  if (len <= 0) return -1;
  return Math.max(0, Math.min(len - 1, cur + delta));
}

/** One finished expedition, as remembered by the Delve Log after the dive ends. */
export interface DelveRecord {
  tick: number; // world tick the delve ended
  regionId: string;
  kills: number; // encounters cleared this dive
  lootGp: number; // loot at stake when it ended — banked if survived, lost if died
  died: boolean; // true = fell in combat; false = extracted with the spoils
}

/** Newest expeditions kept in the Delve Log. */
export const DELVE_LOG_CAP = 30;

/**
 * Turn an ending expedition into a Delve Log entry. `died` is the caller's robust
 * signal (the dive vanished mid-combat) — you can only extract out of combat, so
 * ending-in-combat means death, ending-otherwise means a clean extract. Pure.
 */
export function summarizeDelve(
  snapshot: { regionId: string; cleared: number; packGp: number },
  died: boolean,
  tick: number,
): DelveRecord {
  return { tick, regionId: snapshot.regionId, kills: snapshot.cleared, lootGp: snapshot.packGp, died };
}

/** The Delve Log newest-first, capped to `n` — the order the panel shows. Pure. */
export function recentDelves(delves: DelveRecord[] | undefined, n: number): DelveRecord[] {
  return (delves ?? []).slice(-n).reverse();
}

/** A region's full native roster: its encounter pool + named elite, deduped, order-stable. */
export function regionRoster(region: { monsters: string[]; elite?: string }): string[] {
  const ids = region.elite ? [...region.monsters, region.elite] : [...region.monsters];
  return [...new Set(ids)];
}

/** Per-region monster-mastery completion — the row of the Region Conquest codex. */
export interface RegionMastery {
  slain: number; // distinct roster monsters you've killed at least once
  total: number; // size of the region's native roster
  done: boolean; // every native foe slain (a region fully conquered)
}

/**
 * How much of a region's native roster (encounter pool + elite) you've cleared,
 * from the lifetime `killsByMonster` tally. `done` only when EVERY native foe —
 * including the elite — has been slain at least once, a deeper bar than merely
 * unlocking past the region. Pure (kills injected). A region with no roster is
 * never "done" (guards a 0/0 division at the call site too).
 */
export function regionMastery(
  region: { monsters: string[]; elite?: string },
  killsByMonster: Record<string, number> | undefined,
): RegionMastery {
  const roster = regionRoster(region);
  const kills = killsByMonster ?? {};
  const slain = roster.filter((id) => (kills[id] ?? 0) > 0).length;
  return { slain, total: roster.length, done: roster.length > 0 && slain === roster.length };
}

/**
 * Expected per-hit damage — mirrors the engine's `damage()` MEAN (quest.ts:394):
 * a uniform roll in [max(1,ceil(atk/3)) .. max(2,atk)], less `floor(def/4)`,
 * floored at 1. Used for the embark forecast; it's the central estimate of a
 * roll, not the roll itself. Keep in sync with quest.ts if that formula moves.
 */
export function expectedHit(atk: number, def: number): number {
  const lo = Math.max(1, Math.ceil(atk / 3));
  const hi = Math.max(2, atk);
  return Math.max(1, (lo + hi) / 2 - Math.floor(def / 4));
}

/** A rough exchange forecast vs one foe — the embark decision aid. */
export interface CombatForecast {
  roundsToKill: number; // rounds for you to down the foe
  roundsToFall: number; // rounds for the foe to down you
  favored: boolean; // you win the exchange
}

/**
 * Forecast a one-on-one exchange from EXPECTED damage both ways. The player
 * strikes first each round, so a tie (you'd kill on the very round you'd fall) is
 * a win → `favored` is `roundsToKill <= roundsToFall`. An estimate (real rounds
 * roll with variance), meant for the embark decision, not a promise. Pure.
 */
export function combatForecast(
  you: { atk: number; def: number; hp: number },
  foe: { atk: number; def: number; hp: number },
): CombatForecast {
  const roundsToKill = Math.ceil(foe.hp / expectedHit(you.atk, foe.def));
  const roundsToFall = Math.ceil(you.hp / expectedHit(foe.atk, you.def));
  return { roundsToKill, roundsToFall, favored: roundsToKill <= roundsToFall };
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
    // Accrue the lifetime book once per genuinely-new fill (this dedupe guard is
    // what makes "apply each fill exactly once" hold).
    applyFillToBook((game.tradeBook ??= emptyTradeBook()), fill, GE_TAX_RATE);
  }
  game.fillScanTick = game.world.tick;
  if (game.fills.length > FILLS_CAP) game.fills.splice(0, game.fills.length - FILLS_CAP);
}

export interface ItemPnL {
  itemId: string;
  /** Realized profit on completed round-trips, gp, after the sell tax. */
  profit: number;
  /** Units sold that had a matching buy in the window. */
  soldUnits: number;
}

/**
 * A lifetime trade book: FIFO open buy lots per item, and realized P&L per
 * item. Accrued one fill at a time (applyFillToBook) so realized profit and
 * cost basis aren't bounded by the capped fills window. Plain JSON.
 */
export interface TradeBook {
  lots: Record<string, { price: number; qty: number }[]>;
  realized: Record<string, { profit: number; soldUnits: number }>;
}

export function emptyTradeBook(): TradeBook {
  return { lots: {}, realized: {} };
}

/**
 * Fold ONE fill into the book (FIFO) — the single source of truth for all P&L.
 * A buy pushes a lot; a sell consumes the oldest lots, booking realized profit
 * (per-unit proceeds net the sell tax). A sell with no cost basis is dropped.
 */
export function applyFillToBook(book: TradeBook, f: Fill, taxRate: number): void {
  if (f.side === 'buy') {
    (book.lots[f.itemId] ??= []).push({ price: f.price, qty: f.qty });
    return;
  }
  const proceeds = f.price - Math.floor(f.price * taxRate); // per-unit, after tax
  const lots = (book.lots[f.itemId] ??= []);
  const acc = (book.realized[f.itemId] ??= { profit: 0, soldUnits: 0 });
  let remaining = f.qty;
  while (remaining > 0 && lots.length > 0) {
    const lot = lots[0]!;
    const take = Math.min(remaining, lot.qty);
    acc.profit += (proceeds - lot.price) * take;
    acc.soldUnits += take;
    lot.qty -= take;
    remaining -= take;
    if (lot.qty === 0) lots.shift();
  }
}

/** A fresh book folded from a fill list — for migration and the window helpers. */
export function bookFromFills(fills: Fill[], taxRate: number): TradeBook {
  const book = emptyTradeBook();
  for (const f of fills) applyFillToBook(book, f, taxRate);
  return book;
}

/** Realized P&L per item from a book, best profit first (id tie-break). */
export function realizedFromBook(book: TradeBook): ItemPnL[] {
  return Object.entries(book.realized)
    .filter(([, v]) => v.soldUnits > 0)
    .map(([itemId, v]) => ({ itemId, profit: v.profit, soldUnits: v.soldUnits }))
    .sort((a, b) => b.profit - a.profit || (a.itemId < b.itemId ? -1 : 1));
}

/** Flip consistency: hit-rate + standouts, the "how often / how badly" lens. */
export interface TradeRecord {
  winners: number; // items closed at a net profit
  losers: number; // items closed at a net loss
  best: { itemId: string; profit: number } | null; // your most profitable item
  worst: { itemId: string; profit: number } | null; // your biggest loser (the lesson)
}

/**
 * Consistency stats over the lifetime book — complements totalRealized's
 * magnitude with hit-rate (how OFTEN your flips win) and the worst trade (the one
 * the top-by-profit list hides). Items are scored by NET realized profit, so a
 * few good fills can rescue an item from the loss column. Pure; `realizedFromBook`
 * is already profit-desc, so `best`/`worst` are its ends.
 */
export function tradeRecord(book: TradeBook): TradeRecord {
  const pnl = realizedFromBook(book);
  return {
    winners: pnl.filter((p) => p.profit > 0).length,
    losers: pnl.filter((p) => p.profit < 0).length,
    best: pnl.length > 0 ? { itemId: pnl[0]!.itemId, profit: pnl[0]!.profit } : null,
    worst: pnl.length > 0 ? { itemId: pnl[pnl.length - 1]!.itemId, profit: pnl[pnl.length - 1]!.profit } : null,
  };
}

/** Lifetime realized P&L across all items (the "locked in" bottom line). */
export function totalRealized(book: TradeBook): number {
  let sum = 0;
  for (const v of Object.values(book.realized)) sum += v.profit;
  return sum;
}

/**
 * Unrealized P&L across all open positions: for each held lot, (current price −
 * cost) × qty, marked at `priceOf`. Price lookup is injected so it's pure and
 * testable; items with no price (≤0) are skipped (no mark, no paper P&L).
 */
export function totalUnrealized(book: TradeBook, priceOf: (itemId: string) => number): number {
  let sum = 0;
  for (const [itemId, lots] of Object.entries(book.lots)) {
    const price = priceOf(itemId);
    if (price <= 0) continue;
    for (const lot of lots) sum += (price - lot.price) * lot.qty;
  }
  return sum;
}

/** Open bought position in one item from a book: leftover lots, weighted avg. */
export function openFromBook(book: TradeBook, itemId: string): { units: number; avgCost: number } | null {
  const lots = book.lots[itemId] ?? [];
  let units = 0;
  let cost = 0;
  for (const lot of lots) {
    units += lot.qty;
    cost += lot.qty * lot.price;
  }
  return units > 0 ? { units, avgCost: Math.round(cost / units) } : null;
}

/** One held position, marked to a live price — the row of the Open Positions glance. */
export interface HeldPosition {
  itemId: string;
  units: number;
  avgCost: number; // weighted-average buy price per unit (from the FIFO book)
  mark: number; // per-unit mark price (falls back to avgCost when no live price)
  marked: boolean; // false when there's no live price — paper P&L is unknown, shown flat
  value: number; // units * mark
  cost: number; // units * avgCost
  unrealized: number; // value - cost (0 when unmarked)
  unrealizedPct: number; // unrealized / cost (0 when cost is 0)
}

/**
 * Every open bought position, each marked at `markOf` — the portfolio glance the
 * ticket only ever showed one item at a time. Pure (price lookup injected, book
 * iterated in sorted id order). A position with no live price (markOf ≤ 0) is
 * still listed but marked flat (mark = avgCost, unrealized = 0) rather than shown
 * as a fake total loss. Sorted best paper P&L first, id tie-break — winners on top.
 */
export function heldPositions(book: TradeBook, markOf: (itemId: string) => number): HeldPosition[] {
  const out: HeldPosition[] = [];
  for (const itemId of Object.keys(book.lots).sort()) {
    const open = openFromBook(book, itemId);
    if (!open) continue;
    const raw = markOf(itemId);
    const marked = raw > 0;
    const mark = marked ? raw : open.avgCost;
    const cost = open.units * open.avgCost;
    const value = open.units * mark;
    const unrealized = value - cost;
    out.push({
      itemId,
      units: open.units,
      avgCost: open.avgCost,
      mark,
      marked,
      value,
      cost,
      unrealized,
      unrealizedPct: cost > 0 ? unrealized / cost : 0,
    });
  }
  return out.sort((a, b) => b.unrealized - a.unrealized || (a.itemId < b.itemId ? -1 : 1));
}

/** Portfolio concentration across held positions — the diversification/risk lens. */
export interface Concentration {
  weights: { itemId: string; pct: number }[]; // each position's share of total value (0..1), largest first
  topPct: number; // the single largest weight — how exposed you are to one item
  count: number; // number of open positions
}

/**
 * What fraction of your held value sits in each position — the risk counterpart
 * to the P&L view. Marked-to-market `value` (not cost), so it reflects what you'd
 * actually have at risk now. Sorted largest-first (id tie-break); `topPct` is the
 * single biggest exposure. Pure; empty book → zeros.
 */
export function positionConcentration(positions: HeldPosition[]): Concentration {
  const total = positions.reduce((s, p) => s + p.value, 0);
  const weights = positions
    .map((p) => ({ itemId: p.itemId, pct: total > 0 ? p.value / total : 0 }))
    .sort((a, b) => b.pct - a.pct || (a.itemId < b.itemId ? -1 : 1));
  return { weights, topPct: weights[0]?.pct ?? 0, count: positions.length };
}

/** Net worth split by liquidity — the cash-vs-committed-vs-goods lens. */
export interface WorthBreakdown {
  cash: number; // liquid gp on hand
  buyOrders: number; // gp escrowed in resting buy offers (cancelable back to cash)
  holdings: number; // items (inventory + sell escrow) at liquidation value
  total: number; // = playerWorth
}

/**
 * Decompose net worth into cash, buy-order escrow, and holdings. `cash` and the
 * buy escrow (Σ remaining×price over resting buys) come straight off the view;
 * holdings is the RESIDUAL (`total − cash − buyOrders`), so the split sums to
 * `total` exactly without re-deriving the engine's bid-walk valuation. Note
 * `total` (netWorth) excludes expedition loot — that's at-risk, not yet banked.
 * Pure.
 */
export function worthBreakdown(view: PlayerView, total: number): WorthBreakdown {
  const cash = view.gp;
  const buyOrders = view.openOrders
    .filter((o) => o.side === 'buy')
    .reduce((s, o) => s + o.remaining * o.price, 0);
  return { cash, buyOrders, holdings: Math.max(0, total - cash - buyOrders), total };
}

/** How a buy reshapes a position you already hold — the average-down preview. */
export interface BlendedBuy {
  units: number; // resulting total units
  avgCost: number; // resulting quantity-weighted average cost per unit
  prevUnits: number;
  prevAvg: number;
  delta: number; // avgCost − prevAvg: <0 averaging down, >0 averaging up, 0 unchanged
}

/**
 * Preview the new average cost after adding `addQty` units @ `addPrice` to an
 * open buy position. Buys carry no GE tax (tax is sell-side), so the blend is
 * raw cost over raw units — consistent with the FIFO book's lot prices. Returns
 * null when there's no position to blend with (a fresh buy has no average-down
 * story) or the add is non-positive. Pure.
 */
export function blendBuy(
  open: { units: number; avgCost: number } | null,
  addQty: number,
  addPrice: number,
): BlendedBuy | null {
  if (!open || open.units <= 0 || addQty <= 0 || addPrice < 0) return null;
  const units = open.units + addQty;
  const avgCost = Math.round((open.units * open.avgCost + addQty * addPrice) / units);
  return { units, avgCost, prevUnits: open.units, prevAvg: open.avgCost, delta: avgCost - open.avgCost };
}

/**
 * The least whole sell price that recovers `avgCost` per unit after the GE sell
 * tax — your break-even floor. The tax is `floor(price * taxRate)` (integer gp),
 * NOT a clean `price * (1 - taxRate)`, so `avgCost / (1 - taxRate)` overshoots:
 * we take that as an upper estimate then tighten to the true minimum integer
 * where `price - floor(price * taxRate) >= avgCost`. Pure. 0 for a zero basis.
 */
export function breakEvenSell(avgCost: number, taxRate: number): number {
  if (avgCost <= 0) return 0;
  let p = Math.ceil(avgCost / (1 - taxRate));
  while (p > 1 && p - 1 - Math.floor((p - 1) * taxRate) >= avgCost) p--; // tighten down
  while (p - Math.floor(p * taxRate) < avgCost) p++; // safety: ensure it clears
  return p;
}

/**
 * Recent *realized* profit per item: FIFO-match each sell fill against the
 * player's earlier buy fills (within the rolling fills window), netting the GE
 * tax on the sale side. Only completed round-trips count — an open position
 * (bought, not yet sold) and a sell with no in-window cost basis are both
 * excluded. Pure (tax rate passed in); sorted best profit first, id tie-break.
 * Window-bounded by design (fills are capped) — this is "recent", not lifetime.
 */
export function realizedPnL(fills: Fill[], taxRate: number): ItemPnL[] {
  return realizedFromBook(bookFromFills(fills, taxRate));
}

/**
 * Your open BOUGHT position in one item: FIFO-match sells against buys and the
 * leftover buy lots are what you bought and still hold, quantity-weighted avg
 * cost. The unrealized counterpart to realizedPnL — compare avgCost to the
 * current price to see if you're up. null when nothing bought-and-unsold
 * remains. Excludes loot (no buy fill, no cost basis). Lots are tax-independent.
 */
export function openPosition(fills: Fill[], itemId: string): { units: number; avgCost: number } | null {
  return openFromBook(bookFromFills(fills, 0), itemId);
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
    id: 'first-blood',
    name: 'Monster Slayer',
    flavor: 'Your first kill in the depths.',
    achieved: (g) => (g.world.stats.monstersSlain ?? 0) >= 1,
  },
  {
    id: 'slayer-25',
    name: 'Veteran of the Depths',
    flavor: 'Twenty-five monsters down. The dark knows your name.',
    achieved: (g) => (g.world.stats.monstersSlain ?? 0) >= 25,
    progress: (g) => (g.world.stats.monstersSlain ?? 0) / 25,
  },
  {
    id: 'pioneer',
    name: 'Frontier Pioneer',
    flavor: 'You walked into the Wilderness and meant it.',
    // Region index 4 = Wilderness Ruins (entered, not just unlocked).
    achieved: (g) => (g.world.stats.deepestRegion ?? 0) >= 4,
  },
  {
    id: 'hellwalker',
    name: 'Hellwalker',
    flavor: 'You stepped through the Inferno Gate. The air noticed.',
    // Region index 6 = The Inferno Gate (entered, not just unlocked).
    achieved: (g) => (g.world.stats.deepestRegion ?? 0) >= 6,
  },
  {
    id: 'abyss-walker',
    name: 'Abyss Walker',
    flavor: 'You looked into the Abyss. It checked your purse.',
    // Region index 7 = The Abyss (entered, not just unlocked).
    achieved: (g) => (g.world.stats.deepestRegion ?? 0) >= 7,
  },
  {
    id: 'swordhand',
    name: 'Swordhand',
    flavor: 'Attack 10. The blade no longer argues.',
    achieved: (g) => levelsOf(g.world.agents[g.playerId]?.combatXp).atk >= 10,
    progress: (g) => levelsOf(g.world.agents[g.playerId]?.combatXp).atk / 10,
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    flavor: 'Defence 10. Things bounce off you now.',
    achieved: (g) => levelsOf(g.world.agents[g.playerId]?.combatXp).def >= 10,
    progress: (g) => levelsOf(g.world.agents[g.playerId]?.combatXp).def / 10,
  },
  {
    id: 'iron-constitution',
    name: 'Iron Constitution',
    flavor: 'Hitpoints 10. You have opinions about pain now, and they are dismissive.',
    achieved: (g) => levelsOf(g.world.agents[g.playerId]?.combatXp).hp >= 10,
    progress: (g) => levelsOf(g.world.agents[g.playerId]?.combatXp).hp / 10,
  },
  {
    id: 'bounty-hunter',
    name: 'Bounty Hunter',
    flavor: 'Five kill orders, five payouts. The realm knows your name.',
    achieved: (g) => (g.world.stats.bountiesClaimed ?? 0) >= 5,
    progress: (g) => (g.world.stats.bountiesClaimed ?? 0) / 5,
  },
  {
    id: 'nine-lives',
    name: 'Nine Lives',
    flavor: 'Nine deaths. The depths are starting to feel like rent.',
    achieved: (g) => (g.world.stats.deaths ?? 0) >= 9,
    progress: (g) => (g.world.stats.deaths ?? 0) / 9,
  },
  {
    id: 'monster-scholar',
    name: 'Monster Scholar',
    flavor: 'Every page of the bestiary, written in something other than ink.',
    achieved: (g) => MONSTERS.every((m) => (g.world.stats.killsByMonster?.[m.id] ?? 0) > 0),
    progress: (g) => MONSTERS.filter((m) => (g.world.stats.killsByMonster?.[m.id] ?? 0) > 0).length / MONSTERS.length,
  },
  {
    id: 'dragon-slayer',
    name: 'Dragon Slayer',
    flavor: 'The Maw is quieter now.',
    // Only dragons mint superior dragon bones — the kill is in the ledger.
    achieved: (g) => (g.world.ledger.itemsMinted['superior_dragon_bones'] ?? 0) > 0,
  },
  {
    id: 'elder-slayer',
    name: 'Elder Slayer',
    flavor: 'Vorkanth has fallen. The Maw remembers.',
    achieved: (g) => (g.world.stats.eliteSlain ?? 0) >= 1,
  },
  {
    id: 'lucky-find',
    name: 'Lucky Find',
    flavor: 'The cache held more than coin.',
    achieved: (g) => (g.world.stats.cacheFinds ?? 0) >= 1,
  },
  {
    id: 'high-roller',
    name: 'High Roller',
    flavor: 'The goblin hates you now.',
    achieved: (g) => (g.world.stats.diceWon ?? 0) >= 3,
    progress: (g) => (g.world.stats.diceWon ?? 0) / 3,
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
      (game.milestoneTicks ??= {})[m.id] = game.world.tick; // stamp when it was earned
      newly.push(m);
    }
  }
  return newly;
}

/** The player's worth as the leaderboard verifies it: the engine's honest
 * liquidation mark (gp + escrow + what the resting bids would pay right now).
 * Display and arbiter MUST agree — a lastPrice view-mark here once disagreed
 * with the verifier by 10× on thin-book hoards (FINDINGS #47/#49). */
export function playerWorth(game: Game): number {
  const agent = game.world.agents[game.playerId];
  return agent ? netWorth(game.world, agent) : 0;
}

/** What death keeps and what it takes — mirrors the engine's keep-3 rule
 * (units sorted by baseCost desc, ties by item id) so the recap toast tells
 * the truth. Display only; the engine already did the bookkeeping. */
export function deathRecap(
  items: { id: string; name: string; baseCost: number }[],
  pack: Record<string, number>,
  packGp: number,
): { kept: string[]; lostUnits: number; lostGp: number } {
  const cost = new Map(items.map((i) => [i.id, i.baseCost]));
  const name = new Map(items.map((i) => [i.id, i.name]));
  const units: { itemId: string; cost: number }[] = [];
  for (const [itemId, qty] of Object.entries(pack)) {
    for (let i = 0; i < qty; i++) units.push({ itemId, cost: cost.get(itemId) ?? 0 });
  }
  units.sort((a, b) => b.cost - a.cost || (a.itemId < b.itemId ? -1 : 1));
  const kept = units.slice(0, 3).map((u) => name.get(u.itemId) ?? u.itemId);
  return { kept, lostUnits: Math.max(0, units.length - 3), lostGp: packGp };
}

/** What the resting bids (excluding the player's own) would pay for `qty` of
 * an item right now: the walkable quantity, the FLOOR price of that walk, and
 * the gross take. A sell placed at exactly the floor fills in full against
 * those bids — instant gp, no resting residue, no slot consumed. Reads the
 * world for display; the actual sale goes through the place command. */
export function bidWalk(game: Game, itemId: string, qty: number): { qty: number; floor: number; gp: number } | null {
  const book = game.world.books[itemId];
  if (!book || qty <= 0) return null;
  let remaining = qty;
  let gp = 0;
  let floor = 0;
  for (const o of book.buys) {
    if (remaining <= 0) break;
    if (o.agentId === game.playerId) continue; // never sell to yourself
    const take = Math.min(remaining, o.remaining);
    gp += take * o.price;
    floor = o.price;
    remaining -= take;
  }
  const sold = qty - remaining;
  return sold > 0 ? { qty: sold, floor, gp } : null;
}

const SAMPLE_EVERY_TICKS = 50;
const SAMPLE_CAP = 240;

const COMPACT_FMT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumSignificantDigits: 3 });

/**
 * Compact gp for headline *aggregates* (net worth, deltas, rates) where scan-
 * ability beats the last digit: 12_345 -> "12.3K", 1_234_567 -> "1.23M",
 * 1.5e9 -> "1.5B". Anything under 10k stays exact-with-commas (precision is
 * cheap there). NOT for cash/prices/quantities — those must read exactly; the
 * full value belongs in a tooltip beside any compacted figure.
 */
export function fmtCompact(n: number): string {
  return Math.abs(n) < 10_000 ? n.toLocaleString('en-US') : COMPACT_FMT.format(n);
}

/**
 * The next "nice" round number above n — the smallest of {1,2,5}×10^k that
 * strictly exceeds n. A motivating target for the worth projection: 55k → 100k,
 * 1.2M → 2M, 6M → 10M, 200k → 500k. Pure.
 */
export function nextRoundTarget(n: number): number {
  if (n < 1) return 1;
  const k = Math.floor(Math.log10(n));
  for (const mult of [1, 2, 5]) {
    const t = mult * 10 ** k;
    if (t > n) return t;
  }
  return 10 ** (k + 1);
}

/** Whether a price alert is hit: a 'below' (buy) alert fires at/under its
 * threshold, an 'above' (sell/take-profit) alert at/over it. Pure. */
export function alertHit(last: number, threshold: number, dir: 'below' | 'above'): boolean {
  return dir === 'below' ? last <= threshold : last >= threshold;
}

/** Offline earning rate in gp/min (1 offline tick ≡ 1 second, so ticks/60 =
 * minutes away). 0 when no time passed. Pure. */
export function offlineRatePerMin(delta: number, ticks: number): number {
  return ticks > 0 ? Math.round((delta * 60) / ticks) : 0;
}

/** Record a net-worth sample if enough ticks have passed since the last one. */
export function recordWorth(game: Game, worth: number): void {
  const h = game.worthHistory;
  const last = h.length > 0 ? h[h.length - 1]!.tick : Number.NEGATIVE_INFINITY;
  if (game.world.tick - last < SAMPLE_EVERY_TICKS) return;
  h.push({ tick: game.world.tick, worth });
  if (h.length > SAMPLE_CAP) h.splice(0, h.length - SAMPLE_CAP);
}

/**
 * Recent net-worth slope as gp per minute (60 ticks = 1 min, matching
 * fmtDuration), measured over the most recent `windowTicks` of throttled
 * worth samples — the "am I winning right now?" signal that the cumulative
 * net delta can't give. Pure; null when there isn't a measurable span yet
 * (fewer than 2 samples, or all samples inside one sample-gap of each other).
 */
export function worthRate(
  history: { tick: number; worth: number }[],
  windowTicks = 600,
): { perMin: number; spanTicks: number } | null {
  if (history.length < 2) return null;
  const last = history[history.length - 1]!;
  const cutoff = last.tick - windowTicks;
  let start = last;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]!.tick >= cutoff) start = history[i]!;
    else break;
  }
  const dt = last.tick - start.tick;
  if (dt <= 0) return null;
  return { perMin: Math.round(((last.worth - start.worth) / dt) * 60), spanTicks: dt };
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
    milestoneTicks: {},
    newsLog: [],
    seenEvents: [],
    fills: [],
    fillScanTick: 0,
    tradeBook: emptyTradeBook(),
    commandLog: [],
    logSince: 0,
  };
}

export const OFFLINE_TPS = 1;
export const OFFLINE_CAP_TICKS = 100_000; // ~28h at 1 tps — a full day away still pays
const OFFLINE_MIN_TICKS = 60; // ignore sub-minute blips (tab switches, reloads)

export interface OfflineResult {
  ticks: number;
  worthBefore: number;
  worthAfter: number;
  /** What the Sellsword hunted/banked while away (10l). */
  sellswordKills: number;
  sellswordBanked: number;
}

export interface OfflinePlan {
  ticks: number;
  worthBefore: number;
  sellswordKills0: number;
  sellswordBanked0: number;
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
  return {
    ticks,
    worthBefore: playerWorth(game),
    sellswordKills0: game.world.stats.sellswordKills ?? 0,
    sellswordBanked0: game.world.stats.sellswordBanked ?? 0,
  };
}

/** Close out a plan after its ticks have run (however they were chunked). */
export function finishOfflineProgress(game: Game, plan: OfflinePlan): OfflineResult {
  const worthAfter = playerWorth(game);
  recordWorth(game, worthAfter);
  return {
    ticks: plan.ticks,
    worthBefore: plan.worthBefore,
    worthAfter,
    sellswordKills: (game.world.stats.sellswordKills ?? 0) - plan.sellswordKills0,
    sellswordBanked: (game.world.stats.sellswordBanked ?? 0) - plan.sellswordBanked0,
  };
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
    milestoneTicks: game.milestoneTicks ?? {},
    delves: game.delves ?? [],
    newsLog: game.newsLog ?? [],
    seenEvents: game.seenEvents ?? [],
    fills: game.fills ?? [],
    fillScanTick: game.fillScanTick ?? 0,
    // Old saves predate the book: rebuild it from whatever fills they kept (the
    // recent window — full history is gone, but it seeds correctly from there).
    tradeBook: game.tradeBook ?? bookFromFills(game.fills ?? [], GE_TAX_RATE),
    // Old saves have no log: they stay playable but can't prove their run.
    commandLog: game.commandLog ?? [],
    logSince: game.logSince ?? (game.commandLog === undefined ? game.world.tick : 0),
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

/** Where an unreadable save is quarantined so a fresh start can't destroy it. */
export const CORRUPT_SAVE_KEY = `${SAVE_KEY}-corrupt`;

export function loadGame(): Game | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    // Same shape gate as importSaveString — a parseable-but-wrong object would
    // otherwise normalize into a half-baked Game that crashes later in render.
    if (!parsed || typeof parsed !== 'object' || !(parsed as Game).world || typeof (parsed as Game).playerId !== 'number') {
      throw new Error('save shape invalid');
    }
    return normalizeGame(parsed as Game);
  } catch (e) {
    // Don't silently destroy a save we couldn't read — the first autosave of
    // a fresh game is about to overwrite SAVE_KEY. Quarantine the original so
    // it's recoverable (export/import) instead of lost forever.
    try {
      localStorage.setItem(CORRUPT_SAVE_KEY, raw);
    } catch {
      /* quota — nothing more we can do */
    }
    console.error('Exchange Wars: unreadable save quarantined to', CORRUPT_SAVE_KEY, e);
    return null;
  }
}

export function clearSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

/**
 * The raw string of a save `loadGame` couldn't read, or null if there's no
 * quarantine. Surfaced so the player can recover an unreadable run (download
 * it, hand-fix, re-import) instead of it sitting invisibly in localStorage.
 */
export function loadCorruptSave(): string | null {
  try {
    return localStorage.getItem(CORRUPT_SAVE_KEY);
  } catch {
    return null;
  }
}

/** Drop the quarantined save — the player chose to let the unreadable run go. */
export function discardCorruptSave(): void {
  try {
    localStorage.removeItem(CORRUPT_SAVE_KEY);
  } catch {
    /* private mode / quota — nothing more we can do */
  }
}
