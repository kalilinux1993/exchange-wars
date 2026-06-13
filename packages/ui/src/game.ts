// Game bootstrap + persistence. The human is an idle-policy player agent:
// engine-inert unless automation is purchased, acting only via UI commands.
import { addAgent, combatLevel, CONSUMABLES, createWorld, DEATH_KEEP_BASE, EVENT_LABELS, GE_TAX_RATE, GEAR, levelsOf, MONSTERS, netWorth, playerView, REGIONS, runTicks } from '@exchange-wars/engine';
import type { GearSlot, PlayerView, RunLogEntry, WorldEvent, WorldState } from '@exchange-wars/engine';

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
  /** An accepted "beat my score" duel (16s/16t): the claimed worth + handle to chase on this run.
   * UI-only (like `ghost`), persisted so the duel survives a reload; cleared when you beat it. */
  duelTarget?: ChallengeTarget;
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

/** Parse a `#seed=N` challenge fragment (the "race a friend" link). Tolerant of trailing
 * `&w=`/`&by=` duel params (16s) so the bare and target-carrying links both resolve the seed. */
export function parseChallengeSeed(hash: string): number | null {
  const m = /^#seed=(\d{1,10})(?:&|$)/.exec(hash);
  if (!m) return null;
  const seed = Number(m[1]);
  return Number.isSafeInteger(seed) ? seed : null;
}

/** Build a challenge link: the seed always, plus the sharer's worth (`&w=`) and handle (`&by=`, encoded)
 * when given — so a shared link can DARE a friend to beat your number, not just play the world. Pure. */
export function challengeLink(origin: string, pathname: string, seed: number, worth?: number, handle?: string): string {
  let hash = `#seed=${seed}`;
  if (worth !== undefined && Number.isFinite(worth) && worth > 0) hash += `&w=${Math.trunc(worth)}`;
  const h = (handle ?? '').trim();
  if (h) hash += `&by=${encodeURIComponent(h)}`;
  return `${origin}${pathname}${hash}`;
}

/** The CLAIMED challenge target carried by a link — a friendly "beat me" figure, NOT a verified score
 * (the replay leaderboard is the proof). `null` when the link has no `&w=`. Pure. */
export interface ChallengeTarget {
  worth: number;
  handle: string | null;
}
/** Has this run beaten its accepted duel target? True once your worth reaches the claimed figure. Pure. */
export function duelWon(target: ChallengeTarget | undefined, worth: number): boolean {
  return target !== undefined && worth >= target.worth;
}

export function parseChallengeTarget(hash: string): ChallengeTarget | null {
  const wm = /[#&]w=(\d{1,15})(?:&|$)/.exec(hash);
  if (!wm) return null;
  const worth = Number(wm[1]);
  if (!Number.isSafeInteger(worth) || worth <= 0) return null;
  const bm = /[#&]by=([^&]+)(?:&|$)/.exec(hash);
  let handle: string | null = null;
  if (bm) {
    try {
      handle = decodeURIComponent(bm[1]!).trim().slice(0, 24) || null;
    } catch {
      handle = null; // malformed encoding — drop the name, keep the number
    }
  }
  return { worth, handle };
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
 * A daily-streak milestone worth a toast, or null. Fires only when the streak GREW to ≥2 — a
 * genuine continuation, not the first day (count 1) nor a reset-to-1 break (count fell). `best`
 * flags a new personal record. Pure — the positive-reinforcement half of the streak loop.
 */
export function streakCelebration(
  prev: DailyStreak | null,
  next: DailyStreak,
): { count: number; best: boolean } | null {
  const prevCount = prev?.count ?? 0;
  if (next.count > prevCount && next.count >= 2) return { count: next.count, best: next.count >= next.best };
  return null;
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
 * Whether to fire the one-time "new daily record" celebration: there's a real
 * record carried in from a prior session (`incomingBest` non-null) and current
 * worth has now passed it. Pure; the caller latches it so it fires once.
 */
export function beatRecord(incomingBest: number | null, worth: number): boolean {
  return incomingBest !== null && worth > incomingBest;
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

/** Lifetime raid risk/reward from the Delve Log — the raiding counterpart to trading P&L. */
export interface RaidTotals {
  runs: number;
  deaths: number;
  banked: number; // loot gp kept from delves you survived
  lost: number; // loot gp forfeited to the dark on deaths
}

/** Aggregate the Delve Log: loot banked on survival vs lost to deaths, and the counts. Pure. */
export function raidTotals(delves: DelveRecord[] | undefined): RaidTotals {
  const list = delves ?? [];
  let banked = 0;
  let lost = 0;
  let deaths = 0;
  for (const d of list) {
    if (d.died) {
      lost += d.lootGp;
      deaths += 1;
    } else {
      banked += d.lootGp;
    }
  }
  return { runs: list.length, deaths, banked, lost };
}

/** Per-region raid risk/reward — one region's slice of the Delve Log. */
export interface RegionRaid {
  regionId: string;
  runs: number;
  deaths: number;
  banked: number; // loot kept on survival
  lost: number; // loot forfeited on death
  net: number; // banked − lost
}

/**
 * The Delve Log grouped BY region — "which region is my best (or deadliest) farm?". Ranked by
 * net loot (banked − lost) descending, then runs, then id for a stable order. Pure.
 */
export function raidTotalsByRegion(delves: DelveRecord[] | undefined): RegionRaid[] {
  const byId: Record<string, RegionRaid> = {};
  for (const d of delves ?? []) {
    const r = (byId[d.regionId] ??= { regionId: d.regionId, runs: 0, deaths: 0, banked: 0, lost: 0, net: 0 });
    r.runs += 1;
    if (d.died) {
      r.deaths += 1;
      r.lost += d.lootGp;
    } else {
      r.banked += d.lootGp;
    }
  }
  const list = Object.values(byId);
  for (const r of list) r.net = r.banked - r.lost;
  return list.sort((a, b) => b.net - a.net || b.runs - a.runs || (a.regionId < b.regionId ? -1 : 1));
}

/** The reward side of a region: what its roster pays out. The forward complement to the
 * backward-looking `raidTotalsByRegion` (history) — used pre-embark to weigh loot vs danger. */
export interface RegionLoot {
  gpLo: number; // smallest single-kill gp floor across the roster
  gpHi: number; // largest single-kill gp ceiling across the roster
  drops: { itemId: string; chance: number }[]; // distinct drops at their BEST chance, likeliest first
}

/**
 * Aggregate a region roster's loot: the gp-per-kill range its foes carry, and every distinct item
 * they can drop kept at its best chance across the roster, sorted likeliest-first (id tie-break).
 * Structural roster param so this stays engine-import-free and pure. Empty roster → zeros / [].
 */
export function regionLoot(
  roster: { gp: [number, number]; drops: { itemId: string; chance: number }[] }[],
): RegionLoot {
  let gpLo = Infinity;
  let gpHi = 0;
  const best = new Map<string, number>();
  for (const m of roster) {
    gpLo = Math.min(gpLo, m.gp[0]);
    gpHi = Math.max(gpHi, m.gp[1]);
    for (const d of m.drops) best.set(d.itemId, Math.max(best.get(d.itemId) ?? 0, d.chance));
  }
  const drops = [...best.entries()]
    .map(([itemId, chance]) => ({ itemId, chance }))
    .sort((a, b) => b.chance - a.chance || (a.itemId < b.itemId ? -1 : 1));
  return { gpLo: gpLo === Infinity ? 0 : gpLo, gpHi, drops };
}

/** Where a tradeable item can be FARMED — the inverse of `regionLoot`. Links the trade economy
 * (the price) to the dive economy (the foe that supplies it). */
export interface ItemSource {
  monsterId: string;
  monsterName: string;
  regionId: string | null; // the region whose roster holds this foe (null if it's in no roster)
  regionName: string | null;
  chance: number;
}

/**
 * Reverse-index the drop tables: every monster that drops `itemId`, with the region its roster sits in
 * (roster = `region.monsters` + `region.elite`), sorted likeliest-first (monster-id tie-break). Pure;
 * structural params so it stays engine-import-free. Empty when nothing drops the item (a pure commodity).
 */
export function itemSources(
  itemId: string,
  monsters: { id: string; name: string; drops: { itemId: string; chance: number }[] }[],
  regions: { id: string; name: string; monsters: string[]; elite?: string }[],
): ItemSource[] {
  const regionOf = (monsterId: string): { id: string; name: string } | null =>
    regions.find((r) => r.monsters.includes(monsterId) || r.elite === monsterId) ?? null;
  const out: ItemSource[] = [];
  for (const m of monsters) {
    const drop = m.drops.find((d) => d.itemId === itemId);
    if (!drop) continue;
    const region = regionOf(m.id);
    out.push({
      monsterId: m.id,
      monsterName: m.name,
      regionId: region?.id ?? null,
      regionName: region?.name ?? null,
      chance: drop.chance,
    });
  }
  return out.sort((a, b) => b.chance - a.chance || (a.monsterId < b.monsterId ? -1 : 1));
}

/** A player's PEAK dives — the "best ever" markers the lifetime aggregates don't capture. */
export interface DiveRecords {
  /** Most loot banked from a single SURVIVED dive (a death forfeits the loot — not a haul). */
  bestHaul: { regionId: string; lootGp: number } | null;
  /** Most encounters cleared in one dive (counts even a dive you fell on — you still cleared them). */
  mostKills: { regionId: string; kills: number } | null;
}

/** The biggest single haul and the deepest single clear from the Delve Log. Pure. */
export function diveRecords(delves: DelveRecord[] | undefined): DiveRecords {
  let bestHaul: DiveRecords['bestHaul'] = null;
  let mostKills: DiveRecords['mostKills'] = null;
  for (const d of delves ?? []) {
    if (!d.died && (bestHaul === null || d.lootGp > bestHaul.lootGp)) bestHaul = { regionId: d.regionId, lootGp: d.lootGp };
    if (mostKills === null || d.kills > mostKills.kills) mostKills = { regionId: d.regionId, kills: d.kills };
  }
  return { bestHaul, mostKills };
}

/**
 * Did this just-finished dive set a NEW best haul? True only if it SURVIVED (a death forfeits
 * the loot) and beat the best banked haul among the PRIOR dives. The first survived dive sets the
 * bar silently (no prior to beat) — celebrate a genuine improvement, not a trivial first run. Pure.
 */
export function isNewBestHaul(priorDelves: DelveRecord[] | undefined, record: DelveRecord): boolean {
  if (record.died) return false;
  const prior = diveRecords(priorDelves).bestHaul;
  return prior !== null && record.lootGp > prior.lootGp;
}

/** A consecutive-clean-extraction streak: how many dives you've survived in a row right now, and the
 * longest such run ever. A death resets the trailing run (but never lowers the best). The risk-management
 * counterpart to the daily login streak — a number a careful extract protects. Pure; one pass. */
export interface DiveStreak {
  current: number; // trailing dives survived in a row (0 if your last dive died, or no dives yet)
  best: number; // longest consecutive-survived run in the whole history
}
export function diveStreak(delves: DelveRecord[] | undefined): DiveStreak {
  let run = 0;
  let best = 0;
  for (const d of delves ?? []) {
    run = d.died ? 0 : run + 1;
    if (run > best) best = run;
  }
  return { current: run, best }; // at loop end, `run` is the trailing (current) streak
}

/**
 * Which room tabs to flag with an "unseen activity" dot. A room is flagged when an event relevant to it
 * fired while it was NOT the active room, and it isn't already flagged. Returns the SAME object when
 * nothing changes, so the caller can bail the re-render (call it every tick safely). Pure; string-typed.
 */
export function markRooms(
  prev: Record<string, boolean>,
  fired: { exchange?: boolean; hall?: boolean },
  active: string,
): Record<string, boolean> {
  let next = prev;
  if (fired.exchange && active !== 'exchange' && !prev['exchange']) next = { ...next, exchange: true };
  if (fired.hall && active !== 'hall' && !prev['hall']) next = { ...next, hall: true };
  return next;
}

/** Survival-streak lengths worth a celebration. The streak grows by exactly 1 per survived dive, so an
 * exact-membership check fires each milestone once as it's reached (a death resets to 0, never a member). */
export const STREAK_MILESTONES = [5, 10, 25, 50, 100];
export function isStreakMilestone(current: number): boolean {
  return STREAK_MILESTONES.includes(current);
}

/**
 * A shareable one-glance summary of a run — combat level, net worth, peak dive haul, best survival
 * streak, deeds — plus a challenge link to the same seed. The viral loop a leaderboard game grows on:
 * "here's what I did, beat me on this exact world." Pure: `origin`/`pathname` injected (no `window`).
 * Empty stats are omitted (no "0 deeds"); the title + level + worth + link are always present.
 */
export function bragText(game: Game, worth: number, origin: string, pathname: string, handle?: string): string {
  const xp = game.world.agents[game.playerId]?.combatXp;
  const streak = diveStreak(game.delves);
  const records = diveRecords(game.delves);
  const bits = [`combat ${combatLevel(xp)}`, `${fmtCompact(worth)} gp`];
  if (records.bestHaul) bits.push(`best haul ${fmtCompact(records.bestHaul.lootGp)}`);
  if (streak.best > 0) bits.push(`${streak.best}-dive streak`);
  if (game.milestones.length > 0) bits.push(`${game.milestones.length} deeds`);
  // The brag's link IS a duel — it dares the reader to beat THIS worth on the seed (16s).
  const link = challengeLink(origin, pathname, game.world.seed, worth, handle);
  return `⚔ Exchange Wars — ${bits.join(' · ')}\nBeat me on seed ${game.world.seed}: ${link}`;
}

/** A region's full native roster: its encounter pool + named elite, deduped, order-stable. */
export function regionRoster(region: { monsters: string[]; elite?: string }): string[] {
  const ids = region.elite ? [...region.monsters, region.elite] : [...region.monsters];
  return [...new Set(ids)];
}

/** Region NAMES where a monster appears — its encounter pool or as the named elite — shallowest first.
 *  The inverse of `regionRoster`; tells a bounty hunter WHERE to go (17x). Pure. */
export function monsterRegions(monsterId: string): string[] {
  return REGIONS.filter((r) => r.monsters.includes(monsterId) || r.elite === monsterId).map((r) => r.name);
}

/** The id of the shallowest region a monster spawns in (encounter pool or elite), or null if it appears
 *  nowhere — the jump target for the bounty "hunt" action (18f). The id-returning sibling of
 *  `monsterRegions` (which returns names for display); both walk REGIONS depth-order, so this is the id of
 *  `monsterRegions(id)[0]`. Pure. */
export function huntRegionId(monsterId: string): string | null {
  return REGIONS.find((r) => r.monsters.includes(monsterId) || r.elite === monsterId)?.id ?? null;
}

/** The named elites in encounter order — rare boss spawns outside the normal pools. */
export const ELITES: { id: string; name: string }[] = MONSTERS.filter((m) => m.elite).map((m) => ({ id: m.id, name: m.name }));

/** The dragon monsters — for the Dragon Slayer deed (17b). Self-maintaining: any `*_dragon` monster
 *  counts. (Vorkanth, the dragon-elite of the Maw, is intentionally not listed — reaching him means
 *  green dragons already fell.) */
export const DRAGON_IDS: string[] = MONSTERS.filter((m) => m.id.endsWith('_dragon')).map((m) => m.id);

/**
 * Which elites have a fresh first-kill: present in `kills` (>=1) but not yet in the
 * `slain` baseline. Pure — the caller owns the baseline Set (booted from the save so an
 * elite felled in a PRIOR session is adopted silently, like the level baseline). Order
 * follows ELITES (encounter order), so a multi-elite catch-up reads shallow→deep. */
export function newElites(slain: ReadonlySet<string>, kills: Record<string, number> | undefined): { id: string; name: string }[] {
  if (!kills) return [];
  return ELITES.filter((e) => (kills[e.id] ?? 0) >= 1 && !slain.has(e.id));
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
 * Expected per-hit damage — mirrors the engine's `damage()` MEAN (quest.ts:407):
 * a uniform roll in [max(1,ceil(atk/3)) .. max(2,atk)], less `floor(def/4)`,
 * floored at 1. Used for the embark forecast; it's the central estimate of a
 * roll, not the roll itself. Keep in sync with quest.ts if that formula moves.
 */
export function expectedHit(atk: number, def: number): number {
  const lo = Math.max(1, Math.ceil(atk / 3));
  const hi = Math.max(2, atk);
  return Math.max(1, (lo + hi) / 2 - Math.floor(def / 4));
}

/**
 * Chance a swing LANDS — mirrors the engine's `hitChance` (quest.ts:410) EXACTLY:
 * `0.55 + (atk − def)·0.02`, clamped to [0.15, 0.95]. Keep in sync with quest.ts if
 * that formula moves. Pure. The engine rolls this before every `damage()`, so a
 * forecast that ignores it over-counts a missing attacker's output.
 */
export function hitChance(atk: number, def: number): number {
  return Math.min(0.95, Math.max(0.15, 0.55 + (atk - def) * 0.02));
}

/** A rough exchange forecast vs one foe — the embark decision aid. */
export interface CombatForecast {
  roundsToKill: number; // rounds for you to down the foe
  roundsToFall: number; // rounds for the foe to down you
  favored: boolean; // you win the exchange
}

/**
 * Forecast a one-on-one exchange from expected damage PER ROUND both ways — which is
 * `hitChance · expectedHit` (the engine rolls accuracy before every hit, quest.ts:454/475),
 * NOT `expectedHit` alone: ignoring the 0.15–0.95 miss rate over-counts a missing attacker
 * and (since hit rates are asymmetric) skews the verdict toward the middle. The player strikes
 * first each round, so a tie (you'd kill on the very round you'd fall) is a win → `favored` is
 * `roundsToKill <= roundsToFall`. `foeHitBonus` is flat extra damage on a LANDED foe hit —
 * dragonfire's `ceil(atk/2)` when no antifire (quest.ts:481) — so it sits INSIDE the foe's
 * accuracy multiply. An estimate (real rounds roll with variance), not a promise. Pure.
 */
export function combatForecast(
  you: { atk: number; def: number; hp: number },
  foe: { atk: number; def: number; hp: number },
  foeHitBonus = 0,
): CombatForecast {
  const yourDpr = hitChance(you.atk, foe.def) * expectedHit(you.atk, foe.def);
  const foeDpr = hitChance(foe.atk, you.def) * (expectedHit(foe.atk, you.def) + foeHitBonus);
  const roundsToKill = Math.ceil(foe.hp / yourDpr);
  const roundsToFall = Math.ceil(you.hp / foeDpr);
  return { roundsToKill, roundsToFall, favored: roundsToKill <= roundsToFall };
}

/**
 * Total hp the consumables in a dive pack could restore — the raw sum of every
 * `heal` × qty. Used to show how much survival your PACKED food buys in the
 * push-read (14o). Deliberately OPTIMISTIC: it ignores overheal (eating a 20-heal
 * shark at near-full wastes the overflow), matching the forecast's own
 * expected-value, estimate-not-a-promise framing. Pure.
 */
export function healFromPack(pack: Record<string, number>): number {
  let total = 0;
  for (const [id, qty] of Object.entries(pack)) {
    if (qty > 0) total += (CONSUMABLES[id]?.heal ?? 0) * qty;
  }
  return total;
}

/**
 * The items a saved loadout can't fully stock from your current inventory — `applyLoadout` silently
 * clamps each to what you hold (`Math.min(want, have)`) and drops anything you're out of, so this is
 * exactly what that clamp would quietly take away. One entry per under-stocked item (want > have,
 * have=0 included), sorted by itemId for a deterministic readout. Empty when the kit fits. Pure.
 */
export function loadoutShort(
  loadout: Record<string, number>,
  inventory: Record<string, number>,
): { itemId: string; want: number; have: number }[] {
  return Object.keys(loadout)
    .filter((id) => loadout[id]! > 0 && (inventory[id] ?? 0) < loadout[id]!)
    .sort()
    .map((id) => ({ itemId: id, want: loadout[id]!, have: inventory[id] ?? 0 }));
}

/** A combat skill that just leveled up — for the celebration toast. */
export interface LevelUp {
  skill: 'atk' | 'def' | 'hp';
  name: string;
  glyph: string;
  level: number;
}

const COMBAT_SKILLS: { skill: 'atk' | 'def' | 'hp'; name: string; glyph: string }[] = [
  { skill: 'atk', name: 'Attack', glyph: '⚔' },
  { skill: 'def', name: 'Defence', glyph: '🛡' },
  { skill: 'hp', name: 'Hitpoints', glyph: '♥' },
];

/** Which combat skills rose between two level snapshots — drives the level-up
 *  celebration (empty when nothing changed or a skill somehow dropped). Pure. */
export function leveledUp(
  prev: { atk: number; def: number; hp: number },
  now: { atk: number; def: number; hp: number },
): LevelUp[] {
  return COMBAT_SKILLS.filter((s) => now[s.skill] > prev[s.skill]).map((s) => ({ ...s, level: now[s.skill] }));
}

/**
 * Ticks for a resting (out-of-field) player to mend back to full — `+1 hp every
 * regenTicks`, so `(max − hp) × regenTicks`. Null when already full (not wounded).
 * Informs "rest vs embark hurt": fast-forward this many ticks to heal. Pure.
 */
export function healEta(hp: number, max: number, regenTicks: number): number | null {
  return hp < max ? (max - hp) * regenTicks : null;
}

/** A pre-embark readiness warning, tagged by what would fix it. */
export interface EmbarkWarning {
  kind: 'antifire' | 'food';
  text: string;
}

/**
 * Pre-embark readiness warnings about the loadout you're PACKING (not what you
 * own) for the selected region. The critical one is antifire for a region whose
 * foes breathe fire — un-enforced and the #1 way to burn. The food warning is
 * gated on a non-favored forecast so it only nags when a hard fight is plausible.
 * Each warning is tagged with the `kind` that fixes it, so the UI can offer a
 * one-click "pack it". Pure (detection booleans computed by the caller).
 */
export function embarkPrep(opts: {
  fiery: boolean;
  hasAntifire: boolean;
  hasFood: boolean;
  riskyFight: boolean;
}): EmbarkWarning[] {
  const w: EmbarkWarning[] = [];
  if (opts.fiery && !opts.hasAntifire)
    w.push({ kind: 'antifire', text: '🔥 foes here breathe fire — pack antifire or you will burn' });
  if (opts.riskyFight && !opts.hasFood)
    w.push({ kind: 'food', text: '🍖 no food packed — a hard fight here and you cannot heal' });
  return w;
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

/** Latch the player's fills out of the rolling trades window; return the
 *  genuinely-new ones this scan (so the caller can notify on resting fills). */
export function recordFills(game: Game): Fill[] {
  const trades = game.world.trades;
  const tail = game.fills.slice(-20);
  const fresh: Fill[] = [];
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
    fresh.push(fill);
    // Accrue the lifetime book once per genuinely-new fill (this dedupe guard is
    // what makes "apply each fill exactly once" hold).
    applyFillToBook((game.tradeBook ??= emptyTradeBook()), fill, GE_TAX_RATE);
  }
  game.fillScanTick = game.world.tick;
  if (game.fills.length > FILLS_CAP) game.fills.splice(0, game.fills.length - FILLS_CAP);
  return fresh;
}

/** A completed round-trip: buy lot(s) closed out by a sell, with its net profit. */
export interface FlipRecord {
  itemId: string;
  qty: number; // units this sell closed against earlier buys
  buyAvg: number; // weighted-avg cost of the matched buy lots
  sellPrice: number; // the sell price (pre-tax, as shown)
  profit: number; // (post-tax proceeds − buy cost) over qty
  tick: number; // the sell's tick
}

/**
 * Recent COMPLETED flips from the fills window — FIFO-matches each sell against
 * earlier buys (same tax as applyFillToBook), so "did my last few trades work?"
 * is a glance the per-item ProfitPanel and the raw fills feed don't give. A sell
 * with no matching buy (dumped loot/spoils) yields no record. Newest first. Pure.
 */
export function recentFlips(fills: Fill[], taxRate: number, limit = 6): FlipRecord[] {
  const lots: Record<string, { price: number; qty: number }[]> = {};
  const flips: FlipRecord[] = [];
  for (const f of fills) {
    if (f.side === 'buy') {
      (lots[f.itemId] ??= []).push({ price: f.price, qty: f.qty });
      continue;
    }
    const itemLots = lots[f.itemId] ?? [];
    let remaining = f.qty;
    let matched = 0;
    let buyCost = 0;
    while (remaining > 0 && itemLots.length > 0) {
      const lot = itemLots[0]!;
      const take = Math.min(remaining, lot.qty);
      buyCost += lot.price * take;
      matched += take;
      lot.qty -= take;
      remaining -= take;
      if (lot.qty === 0) itemLots.shift();
    }
    if (matched > 0) {
      // Per-FILL sell tax on the matched units (floor(price·matched·rate)) — matches the engine + the trade
      // book (18w); per-unit floored to 0 tax below price 50, overstating cheap flips.
      const gross = f.price * matched;
      flips.push({
        itemId: f.itemId,
        qty: matched,
        buyAvg: Math.round(buyCost / matched),
        sellPrice: f.price,
        profit: gross - Math.floor(gross * taxRate) - buyCost,
        tick: f.tick,
      });
    }
  }
  return flips.sort((a, b) => b.tick - a.tick || (a.itemId < b.itemId ? -1 : 1)).slice(0, limit);
}

/** A one-line "your offers filled" summary (units bought/sold), or null if none. */
export function fillSummary(fills: Fill[]): string | null {
  let bought = 0;
  let sold = 0;
  for (const f of fills) {
    if (f.side === 'buy') bought += f.qty;
    else sold += f.qty;
  }
  const parts: string[] = [];
  if (bought > 0) parts.push(`bought ${bought.toLocaleString('en-US')}`);
  if (sold > 0) parts.push(`sold ${sold.toLocaleString('en-US')}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * A richer fill toast line: when the burst is ALL one item on ONE side (the
 * common case — a single resting order clearing), name it ("bought 50 Shark");
 * otherwise fall back to the aggregate `fillSummary`. Pure (name lookup injected).
 */
export function fillToastFlavor(fills: Fill[], nameOf: (id: string) => string): string | null {
  if (fills.length === 0) return null;
  const oneItem = fills.every((f) => f.itemId === fills[0]!.itemId);
  const oneSide = fills.every((f) => f.side === fills[0]!.side);
  if (oneItem && oneSide) {
    const qty = fills.reduce((s, f) => s + f.qty, 0);
    return `${fills[0]!.side === 'buy' ? 'bought' : 'sold'} ${qty.toLocaleString('en-US')} ${nameOf(fills[0]!.itemId)}`;
  }
  return fillSummary(fills);
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
  const lots = (book.lots[f.itemId] ??= []);
  const acc = (book.realized[f.itemId] ??= { profit: 0, soldUnits: 0 });
  let remaining = f.qty;
  let matched = 0;
  let buyCost = 0;
  while (remaining > 0 && lots.length > 0) {
    const lot = lots[0]!;
    const take = Math.min(remaining, lot.qty);
    buyCost += lot.price * take;
    matched += take;
    lot.qty -= take;
    remaining -= take;
    if (lot.qty === 0) lots.shift();
  }
  if (matched > 0) {
    // Net the sell tax PER FILL on the matched units — `floor(price·qty·rate)`, exactly the engine's
    // paySeller (exchange.ts). NOT per-unit `floor(price·rate)`, which is 0 below price 50 and so booked
    // ZERO tax on cheap-staple flips, overstating their profit by the full ~2% (18w). Full match ==
    // engine net; a partial match (selling loot beyond buys) taxes only the matched flip portion.
    const gross = f.price * matched;
    acc.profit += gross - Math.floor(gross * taxRate) - buyCost;
    acc.soldUnits += matched;
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

/** The bleeding side of your book — positions whose paper P&L is underwater. */
export interface Underwater {
  count: number; // how many marked positions are below cost
  paperLoss: number; // summed unrealized of the losers (≤ 0)
  worst: { itemId: string; unrealized: number } | null; // the deepest single loss
}

/**
 * Risk glance over held positions: how many are underwater and by how much, plus
 * the worst single one. heldPositions sorts best-first, so losers sink below the
 * fold — this surfaces them as one line without scrolling. Only MARKED positions
 * count (no live price = unknown P&L, not a loss). Pure.
 */
export function underwaterSummary(positions: HeldPosition[]): Underwater {
  let count = 0;
  let paperLoss = 0;
  let worst: { itemId: string; unrealized: number } | null = null;
  for (const p of positions) {
    if (!p.marked || p.unrealized >= 0) continue;
    count += 1;
    paperLoss += p.unrealized;
    if (!worst || p.unrealized < worst.unrealized) worst = { itemId: p.itemId, unrealized: p.unrealized };
  }
  return { count, paperLoss, worst };
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

export interface BuyConcentration {
  itemValue: number; // this item's value if the pending buy fills (held goods + committed gp)
  worth: number; // your liquid holdings = cash + held goods marked at last price
  pct: number; // itemValue / worth, clamped [0,1] — your single-item exposure after the buy
}

/**
 * Preview how concentrated a pending BUY would leave you in one item — the risk
 * lens at the decision point (PositionsPanel shows it only after the fact). `worth`
 * is liquid holdings (cash + held goods at last price); a buy just swaps cash→goods
 * so `worth` is unchanged by it, making it the honest denominator. `itemValue` adds
 * the gp you'd commit (`addCost`) to the item's current held value. Sum of integer
 * products → order-independent. `null` when you hold nothing (no exposure to size). Pure.
 */
export function buyConcentration(
  view: { gp: number; inventory: Record<string, number>; markets: { itemId: string; lastPrice: number }[] },
  itemId: string,
  addCost: number,
): BuyConcentration | null {
  const lastOf = new Map(view.markets.map((m) => [m.itemId, m.lastPrice]));
  let goods = 0;
  for (const id of Object.keys(view.inventory)) {
    goods += (view.inventory[id] ?? 0) * (lastOf.get(id) ?? 0);
  }
  const worth = view.gp + goods;
  if (worth <= 0) return null;
  const heldVal = (view.inventory[itemId] ?? 0) * (lastOf.get(itemId) ?? 0);
  const itemValue = heldVal + addCost;
  return { itemValue, worth, pct: Math.max(0, Math.min(1, itemValue / worth)) };
}

/**
 * From the items you hold, the ones a bulk "sell the spoils" should dump — your
 * GEAR is kept out (it lives in the satchel between raids; one click shouldn't
 * liquidate your kit). Sell gear deliberately, one stack at a time. Pure.
 */
export function lootSpoils(heldIds: string[], isGear: (id: string) => boolean): string[] {
  return heldIds.filter((id) => !isGear(id));
}

/** How a held gear piece compares to whatever is WORN in its slot. */
export interface GearDelta {
  slot: GearSlot;
  /** Governing-stat change vs the worn piece (weapon→Attack, armor→Defence).
   * >0 upgrade, <0 downgrade, 0 sidegrade. Nothing worn → the full stat. */
  delta: number;
  /** Incidental off-stat change (e.g. a body's small atk) — for the tooltip. */
  offDelta: number;
  /** False when your level is below the piece's req — can't realize it yet. */
  usable: boolean;
  req: number;
  skill: 'atk' | 'def';
  /** The id currently worn in this slot we compared against (null = empty slot). */
  vs: string | null;
}

/**
 * "Is this gear an upgrade?" — the readout that makes buying upgrade gear legible.
 * Compares a held piece to what's persistently WORN in its slot on the governing
 * stat (weapon→atk, armor→def); an empty slot means the whole stat is the gain.
 * Returns null for non-gear. Pure — drives the satchel delta badge.
 */
export function gearDelta(
  itemId: string,
  worn: Record<string, string>,
  lvls: { atk: number; def: number },
): GearDelta | null {
  const g = GEAR[itemId];
  if (!g) return null;
  const skill: 'atk' | 'def' = g.slot === 'weapon' ? 'atk' : 'def';
  const wornId = worn[g.slot];
  const cur = wornId ? GEAR[wornId] : undefined;
  const gov = (x: { atk: number; def: number } | undefined): number => (x ? (skill === 'atk' ? x.atk : x.def) : 0);
  const off = (x: { atk: number; def: number } | undefined): number => (x ? (skill === 'atk' ? x.def : x.atk) : 0);
  return {
    slot: g.slot,
    delta: gov(g) - gov(cur),
    offDelta: off(g) - off(cur),
    usable: lvls[skill] >= g.req,
    req: g.req,
    skill,
    vs: wornId ?? null,
  };
}

/** The single best gear upgrade you can buy and use right now — the advisor's pick. */
export interface UpgradePick {
  itemId: string;
  price: number; // the best ask you'd pay to buy it now
  delta: number; // governing-stat improvement vs what's worn in that slot
  skill: 'atk' | 'def';
  slot: string;
}

/**
 * "What should I buy to get stronger?" — scans the GEAR catalog for the biggest gear
 * upgrade you can AFFORD (a live best-ask within budget), USE (level met), and don't
 * already OWN (owning it means equip, not buy), measured vs what's worn via `gearDelta`.
 * Iterates sorted ids for a deterministic tie-break (max delta, then cheaper, then id).
 * Returns null when nothing qualifies. Pure — markets/inventory injected.
 */
export function bestAffordableUpgrade(
  worn: Record<string, string>,
  lvls: { atk: number; def: number },
  gp: number,
  markets: { itemId: string; bestAsk: number | null }[],
  inventory: Record<string, number>,
): UpgradePick | null {
  const askOf = new Map(markets.map((m) => [m.itemId, m.bestAsk]));
  let best: UpgradePick | null = null;
  for (const itemId of Object.keys(GEAR).sort()) {
    if ((inventory[itemId] ?? 0) > 0) continue; // already own it — equip, don't buy
    const ask = askOf.get(itemId);
    if (ask === null || ask === undefined || ask > gp) continue; // must be buyable now, in budget
    const gd = gearDelta(itemId, worn, lvls);
    if (!gd || !gd.usable || gd.delta <= 0) continue; // usable + a real upgrade only
    if (best === null || gd.delta > best.delta || (gd.delta === best.delta && ask < best.price)) {
      best = { itemId, price: ask, delta: gd.delta, skill: gd.skill, slot: gd.slot };
    }
  }
  return best;
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
  // With `view` and `total` from the SAME engine snapshot, the residual IS the
  // bid-walk holdings value (≥ 0): netWorth = gp + buyEscrow + holdings, and a
  // buy order's escrowGp == remaining*price exactly, so the clamp never fires —
  // it's a display guard against a torn snapshot, not a real subtraction floor.
  return { cash, buyOrders, holdings: Math.max(0, total - cash - buyOrders), total };
}

/** Your all-time result against the stake you began with. */
export interface StakeReturn {
  /** Net worth now minus the original stake (gp; negative = underwater). */
  delta: number;
  /** delta / stake as a fraction (0.25 = +25%); 0 when stake is 0. */
  pct: number;
  up: boolean;
}

/**
 * Return on your starting stake — the "am I up, and by how much?" glance that
 * `worth` alone doesn't answer. `startGp` is the original HUMAN_START_GP, kept
 * across reloads, so this is lifetime profit vs your first coin (what the
 * double-your-stake deed tracks), not session-scoped. Pure. At-risk expedition
 * loot is excluded because `worth` excludes it (unbanked = not yours yet).
 */
export function returnOnStake(startGp: number, worth: number): StakeReturn {
  const delta = worth - startGp;
  return { delta, pct: startGp > 0 ? delta / startGp : 0, up: delta >= 0 };
}

/**
 * Net-worth change THIS session — vs a `baseline` worth captured when the app was
 * opened (App owns the baseline and re-captures it on a game swap). The short-term
 * "am I up since I sat down?" read, distinct from `returnOnStake`'s lifetime figure.
 * Same shape as a stake return; `pct` guards a zero baseline. Pure.
 */
export function sessionPnL(worth: number, baseline: number): StakeReturn {
  const delta = worth - baseline;
  return { delta, pct: baseline > 0 ? delta / baseline : 0, up: delta >= 0 };
}

/**
 * What a "new game" would abandon — net worth + earned deeds — and whether there's
 * anything worth warning about. `atStake` is true once you've earned a deed OR grown
 * past your starting stake, so a brand-new run (worth == startGp, no deeds) raises no
 * alarm and the warning MEANS something the rest of the time. Pure (worth injected).
 */
export function restartStakes(
  game: { milestones?: string[]; startGp: number },
  worth: number,
): { worth: number; deeds: number; atStake: boolean } {
  const deeds = game.milestones?.length ?? 0;
  return { worth, deeds, atStake: deeds > 0 || worth > game.startGp };
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
 * Realized recent price action over the trade window the sparkline draws — the LIVE
 * counterpart to an item's static volatility tier (`def.volatility`). `swingPct` is the
 * peak-to-trough range as a fraction of the low; `read` buckets it: steady (<4%) is calm
 * enough that a flip's spread should hold, wild (≥10%) means it can evaporate before both
 * legs fill. Fewer than two trades → `null` (you can't read swing from one point). Pure.
 */
export interface PriceSwing {
  lo: number;
  hi: number;
  swingPct: number; // (hi - lo) / lo
  read: 'steady' | 'choppy' | 'wild';
}
/**
 * Where a price sits in an item's fundamental band as a 0..1 fraction (producer floor `baseCost` = 0,
 * consumer ceiling `consumeValue` = 1), clamped so a price outside the band still reads at the edge,
 * not past it. `null` when there's no band (consumeValue ≤ baseCost). The numeric single-source the
 * `valueBand` category and the sortable band column both read — so a glance and a sort can't disagree.
 * Pure.
 */
export function bandPosition(
  def: { baseCost: number; consumeValue: number } | undefined,
  lastPrice: number,
): number | null {
  if (!def || def.consumeValue <= def.baseCost) return null;
  return Math.max(0, Math.min(1, (lastPrice - def.baseCost) / (def.consumeValue - def.baseCost)));
}

/**
 * Where a price sits in an item's fundamental band (producer floor `baseCost` → consumer
 * ceiling `consumeValue`): `cheap` near the floor (good to accumulate), `rich` near the ceiling
 * (good to offload), `fair` between. `null` when there's no band (consumeValue ≤ baseCost).
 * The category over `bandPosition` — thresholds live here only. Pure.
 */
export function valueBand(
  def: { baseCost: number; consumeValue: number } | undefined,
  lastPrice: number,
): 'cheap' | 'fair' | 'rich' | null {
  const pos = bandPosition(def, lastPrice);
  if (pos === null) return null;
  return pos < 0.34 ? 'cheap' : pos < 0.67 ? 'fair' : 'rich';
}

/**
 * After-tax flip margin PER UNIT at the current spread: undercut the spread one tick each way
 * (buy at bestBid+1, sell at bestAsk−1) and net the 2% sell tax. `null` when the book isn't
 * two-sided or a leg is non-positive. Pure — the single source for the market column AND the
 * watchlist row (they can't disagree on a margin).
 *
 * INVARIANT (do NOT "fix" to per-fill — see 18w/18x): `floor(sell·rate)` is the EXACT tax the engine
 * charges on a ONE-unit sell (paySeller floors per fill; a qty-1 fill at price <50 genuinely pays 0 tax).
 * So this is qty-1-exact. A bulk cheap flip realizes slightly UNDER margin×qty because the engine's
 * per-fill tax `floor(price·qty·rate)` exceeds `qty·floor(price·rate)` — that's the per-unit↔per-fill
 * relationship, not a bug. The realized BOOK (applyFillToBook) is per-fill (qty-known) and was the one
 * that needed the per-fill fix (18w); this per-unit estimate must stay per-unit.
 */
export function flipMargin(m: { bestBid: number | null; bestAsk: number | null }): number | null {
  if (m.bestBid === null || m.bestAsk === null) return null;
  const buy = m.bestBid + 1;
  const sell = m.bestAsk - 1;
  if (buy <= 0 || sell <= 0) return null;
  return sell - buy - Math.floor(sell * GE_TAX_RATE);
}

/**
 * Recent momentum: how far the last price sits above (+) or below (−) its smoothed EMA,
 * as a fraction. `null` when there's no EMA yet (`ema ≤ 0`). Pure — the single source for
 * the market "mom" column, its sort key, and the "movers" track (17z). The economy anchors
 * near EMA in the calm baseline, so this reads ≈0 until an event dislocates a price.
 */
export function momentum(lastPrice: number, ema: number): number | null {
  return ema > 0 ? (lastPrice - ema) / ema : null;
}

/** A one-line macro read of the whole market — breadth + value distribution. */
export interface MarketMood {
  up: number; // traded items trading above their EMA (momentum up)
  down: number; // traded items below their EMA
  cheap: number; // items in the cheap third of their value band
  rich: number; // items in the rich third
}

/**
 * Aggregate the market into a mood: how many items are up vs down (BREADTH — counted only for
 * items with volume, since an untraded item's EMA-vs-last is meaningless), and how many sit cheap
 * vs rich in their fundamental band (via `valueBand`). The macro counterpart to per-item movers. Pure.
 */
export function marketMood(
  markets: { itemId: string; lastPrice: number; ema: number; volume: number }[],
  items: { id: string; baseCost: number; consumeValue: number }[],
): MarketMood {
  const defOf = new Map(items.map((i) => [i.id, i]));
  let up = 0;
  let down = 0;
  let cheap = 0;
  let rich = 0;
  for (const m of markets) {
    if (m.volume > 0) {
      if (m.lastPrice >= m.ema) up += 1;
      else down += 1;
    }
    const b = valueBand(defOf.get(m.itemId), m.lastPrice);
    if (b === 'cheap') cheap += 1;
    else if (b === 'rich') rich += 1;
  }
  return { up, down, cheap, rich };
}

/**
 * A live event's final stretch — its price dislocation is about to revert, so the trading cue is "act or
 * close your position now". Absolute threshold (not a fraction of duration) so "≈150 ticks to act" reads
 * the same whether the event ran 800 or 2000 ticks. Pure (ticks-left injected). 0/negative = already over.
 */
export const EVENT_ENDING_SOON_TICKS = 150;
export function eventEndingSoon(ticksLeft: number): boolean {
  return ticksLeft > 0 && ticksLeft <= EVENT_ENDING_SOON_TICKS;
}

export function priceSwing(prices: number[]): PriceSwing | null {
  if (prices.length < 2) return null;
  let lo = prices[0]!;
  let hi = prices[0]!;
  for (const p of prices) {
    if (p < lo) lo = p;
    if (p > hi) hi = p;
  }
  const swingPct = lo > 0 ? (hi - lo) / lo : 0;
  const read = swingPct < 0.04 ? 'steady' : swingPct < 0.1 ? 'choppy' : 'wild';
  return { lo, hi, swingPct, read };
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
  /** Deeds whose `progress` is a net-worth fraction — the only ones an ETA from the gp/min worth rate is
   *  valid for (17k). Combat/contract/region deeds advance on other axes, so they get no ETA.
   *  CONTRACT: a `paceMetric: 'worth'` deed's `progress` MUST be exactly `worth / threshold` — `deedEta`
   *  recovers the threshold as `worth / progress`, so any other progress shape yields a garbage ETA (17p). */
  paceMetric?: 'worth';
}

/**
 * Minutes-of-worth (tick-minutes, matching `worthRate`'s `perMin`) until a worth-based deed at `progress`
 * (0..1) is reached, at the recent `perMin` rate. The threshold is recovered from progress (`worth/progress`,
 * since a worth deed's progress IS `worth/threshold`), so the raw — not floored — progress must be passed.
 * null when the rate is non-positive (flat/falling — no finish line) or progress is complete/not-started. Pure.
 */
export function deedEta(progress: number, worth: number, perMin: number): number | null {
  if (perMin <= 0 || progress <= 0 || progress >= 1) return null;
  const remaining = worth / progress - worth; // threshold − worth
  return remaining / perMin;
}

export interface GoalView {
  /** Progress toward the target, 0..100 (capped). */
  pct: number;
  /** gp left to reach it (0 once reached). */
  remaining: number;
  /** Tick-minutes to reach it at the recent worth rate (matching deedEta's unit); null if reached or rate ≤ 0. */
  etaMin: number | null;
  reached: boolean;
}
/** A player-set net-worth target's view (17l): progress + an ETA at the recent gp/min worth rate. null when
 *  no goal is set (goal ≤ 0). The flexible companion to the fixed worth-deed ETAs (deedEta). Pure. */
export function goalView(goal: number, worth: number, perMin: number): GoalView | null {
  if (goal <= 0) return null;
  const reached = worth >= goal;
  const remaining = Math.max(0, goal - worth);
  const pct = Math.min(100, Math.floor((worth / goal) * 100));
  const etaMin = !reached && perMin > 0 ? remaining / perMin : null;
  return { pct, remaining, etaMin, reached };
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
    paceMetric: 'worth',
  },
  {
    id: 'doubled',
    name: 'Doubled Up',
    flavor: 'Twice what you walked in with.',
    achieved: (g, _v, worth) => worth >= g.startGp * 2,
    progress: (g, _v, worth) => worth / (g.startGp * 2),
    paceMetric: 'worth',
  },
  {
    id: 'quarter-m',
    name: 'Merchant Prince',
    flavor: 'Clerks nod when you pass.',
    achieved: (_g, _v, worth) => worth >= 250_000,
    progress: (_g, _v, worth) => worth / 250_000,
    paceMetric: 'worth',
  },
  {
    id: 'millionaire',
    name: 'gp Millionaire',
    flavor: 'The ledger needs wider columns.',
    achieved: (_g, _v, worth) => worth >= 1_000_000,
    progress: (_g, _v, worth) => worth / 1_000_000,
    paceMetric: 'worth',
  },
  {
    id: 'five-million',
    name: 'Gold Baron',
    flavor: 'Five million. The vault groans.',
    achieved: (_g, _v, worth) => worth >= 5_000_000,
    progress: (_g, _v, worth) => worth / 5_000_000,
    paceMetric: 'worth',
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
    id: 'realm-conquered',
    name: 'Realm Conquered',
    flavor: 'Every region mastered — every native foe felled at least once. The realm is yours.',
    // The conquest capstone: ALL regions show 👑 in the ConquestPanel. Reuses
    // `regionMastery` so the deed and the panel agree on what "mastered" means.
    achieved: (g) => REGIONS.every((r) => regionMastery(r, g.world.stats.killsByMonster).done),
    progress: (g) => REGIONS.filter((r) => regionMastery(r, g.world.stats.killsByMonster).done).length / REGIONS.length,
  },
  {
    id: 'dragon-slayer',
    name: 'Dragon Slayer',
    flavor: 'The Maw is quieter now.',
    // A dragon must actually FALL to you. (17b) The old proxy — `itemsMinted['superior_dragon_bones'] > 0`
    // — fired off the producer economy, which mints bones within ticks of world creation (0→64 by tick 100),
    // so the deed auto-completed with no kill. Re-keyed on your dragon kills; latched saves are unaffected
    // (checkMilestones only evaluates UNlatched deeds).
    achieved: (g) => DRAGON_IDS.some((id) => (g.world.stats.killsByMonster?.[id] ?? 0) > 0),
  },
  {
    id: 'elder-slayer',
    name: 'Elder Slayer',
    flavor: 'Vorkanth has fallen. The Maw remembers.',
    achieved: (g) => (g.world.stats.eliteSlain ?? 0) >= 1,
  },
  {
    id: 'apex-predator',
    name: 'Apex Predator',
    flavor: 'Skarn, Vorkanth, Zukrath, Vessith — every named terror has fallen to you.',
    // The elite capstone: all FOUR distinct named elites felled (per-id killsByMonster, like
    // monster-scholar/realm-conquered) — a deeper bar than elder-slayer's "any one elite". The
    // collective trophy for the 16w first-kill arc; ELITES is the single elite roster source.
    achieved: (g) => ELITES.every((e) => (g.world.stats.killsByMonster?.[e.id] ?? 0) > 0),
    progress: (g) => ELITES.filter((e) => (g.world.stats.killsByMonster?.[e.id] ?? 0) > 0).length / ELITES.length,
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

/** What death keeps and what it takes — mirrors the engine's keep-N rule
 * (units sorted by baseCost desc, ties by item id; keep `keepN` — 3 by default,
 * 5 with a Death Ward) so the recap toast and the in-dive preview tell the truth.
 * `keepN` MUST match the engine's `expeditionDeath` (commands.ts) for the player's
 * deathWard state, or display and arbiter disagree. Display only. */
export function deathRecap(
  items: { id: string; name: string; baseCost: number }[],
  pack: Record<string, number>,
  packGp: number,
  keepN: number = DEATH_KEEP_BASE,
): { kept: string[]; lostUnits: number; lostGp: number } {
  const cost = new Map(items.map((i) => [i.id, i.baseCost]));
  const name = new Map(items.map((i) => [i.id, i.name]));
  const units: { itemId: string; cost: number }[] = [];
  for (const [itemId, qty] of Object.entries(pack)) {
    for (let i = 0; i < qty; i++) units.push({ itemId, cost: cost.get(itemId) ?? 0 });
  }
  units.sort((a, b) => b.cost - a.cost || (a.itemId < b.itemId ? -1 : 1));
  const kept = units.slice(0, keepN).map((u) => name.get(u.itemId) ?? u.itemId);
  return { kept, lostUnits: Math.max(0, units.length - keepN), lostGp: packGp };
}

/** Past this many ticks resting unfilled, a maker offer is likely mispriced (the market moved away) —
 *  flag it so the player re-prices or aborts dead capital (18i). */
export const STALE_ORDER_TICKS = 500;

/** How long an open offer has been resting: `world.tick − its placement tick`, found by id in the book.
 *  The placement tick (`Order.tick`, the price-time tiebreaker) lives on the full order in `world.books`;
 *  the `OpenOrderView` projection drops it, so this reads `world.books` directly (a display read of state).
 *  null when the order isn't on the book (it filled/cancelled between renders). Floors at 0. Pure. */
export function orderAge(
  world: { tick: number; books: Record<string, { buys: { id: number; tick: number }[]; sells: { id: number; tick: number }[] }> },
  order: { id: number; itemId: string; side: 'buy' | 'sell' },
): number | null {
  const book = world.books[order.itemId];
  if (!book) return null;
  const o = (order.side === 'buy' ? book.buys : book.sells).find((x) => x.id === order.id);
  return o ? Math.max(0, world.tick - o.tick) : null;
}

/** What the resting bids (excluding the player's own) would pay for `qty` of
 * an item right now: the walkable quantity, the FLOOR price of that walk, the
 * gross take (`gp`), and `net` — what the SELLER actually receives after the 2%
 * GE tax, floored PER FILL to mirror the engine's `paySeller` (exchange.ts:166,
 * taxed once per matched bid). Show `net` for a "what you'll realize" decision;
 * `gp` is the bid-side gross. A sell at the floor fills in full against those
 * bids — instant gp, no resting residue, no slot. Reads the world for display;
 * the actual sale goes through the place command. */
export function bidWalk(
  game: Game,
  itemId: string,
  qty: number,
): { qty: number; floor: number; gp: number; net: number } | null {
  const book = game.world.books[itemId];
  if (!book || qty <= 0) return null;
  let remaining = qty;
  let gp = 0;
  let net = 0;
  let floor = 0;
  for (const o of book.buys) {
    if (remaining <= 0) break;
    if (o.agentId === game.playerId) continue; // never sell to yourself
    const take = Math.min(remaining, o.remaining);
    const proceeds = take * o.price;
    gp += proceeds;
    net += proceeds - Math.floor(proceeds * GE_TAX_RATE); // per-fill tax, exactly as paySeller does
    floor = o.price;
    remaining -= take;
  }
  const sold = qty - remaining;
  return sold > 0 ? { qty: sold, floor, gp, net } : null;
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

/** A value-band "buy the dip" alert: true when the price has entered the CHEAP
 * third of the item's cost→value band. Unlike an absolute buy-below alert, this
 * self-adjusts to fundamentals — no threshold to set or maintain. The single
 * source App and the watchlist read so "is it cheap?" can't disagree. Pure. */
export function bandAlertHit(
  def: { baseCost: number; consumeValue: number } | undefined,
  lastPrice: number,
): boolean {
  return valueBand(def, lastPrice) === 'cheap';
}

/** The sell-side sibling of `bandAlertHit`: true when the price has entered the RICH third of the item's
 * cost→value band — a threshold-free "take profit" trigger (self-adjusting, no number to maintain). Pure. */
export function richAlertHit(
  def: { baseCost: number; consumeValue: number } | undefined,
  lastPrice: number,
): boolean {
  return valueBand(def, lastPrice) === 'rich';
}

/** A captured market event with the item price at the moment it became active. */
export interface CapturedEvent {
  itemId: string;
  kind: WorldEvent['kind'];
  startPrice: number;
}
/** How an event resolved: the item's price move over its lifetime. */
export interface EventRecap {
  itemId: string;
  kind: WorldEvent['kind'];
  startPrice: number;
  endPrice: number;
  pct: number; // (end - start) / start
}

/**
 * Reconcile the set of market events seen active last tick against the set active now: newly-active
 * events get captured at their current price; events that were captured but are no longer active have
 * ENDED, so they're returned as recaps (start price vs current price) and dropped from the map. Pure —
 * the caller holds `captured` in a ref and resets it on a game swap (so a swap never recaps stale events).
 */
export function reconcileEvents(
  captured: Record<string, CapturedEvent>,
  activeEvents: { id: string; itemId: string; kind: WorldEvent['kind'] }[],
  priceOf: (itemId: string) => number,
): { recaps: EventRecap[]; captured: Record<string, CapturedEvent> } {
  const activeIds = new Set(activeEvents.map((e) => e.id));
  const next: Record<string, CapturedEvent> = { ...captured };
  for (const e of activeEvents) {
    if (!next[e.id]) next[e.id] = { itemId: e.itemId, kind: e.kind, startPrice: priceOf(e.itemId) };
  }
  const recaps: EventRecap[] = [];
  for (const id of Object.keys(captured).sort()) {
    if (activeIds.has(id)) continue;
    const c = captured[id]!;
    const endPrice = priceOf(c.itemId);
    const pct = c.startPrice > 0 ? (endPrice - c.startPrice) / c.startPrice : 0;
    recaps.push({ itemId: c.itemId, kind: c.kind, startPrice: c.startPrice, endPrice, pct });
    delete next[id];
  }
  return { recaps, captured: next };
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
    delves: [], // parity with normalizeGame — a fresh game must equal a migrated one (16j review)
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

/** The item whose price moved most over a span — the "while you were away" headline. */
export interface MarketMover {
  itemId: string;
  startPrice: number;
  endPrice: number;
  pct: number; // (end - start) / start
}

/**
 * The single biggest price mover from a before→after snapshot — what the market did
 * while you were gone (14y). Skips items with no valid start/end price; only reports a
 * move worth mentioning (≥3%), so a flat market stays quiet rather than crying a 0.1%
 * wiggle as news. Iterates the `after` array (state order) for a deterministic tie-break.
 * Pure — prices injected.
 */
export function biggestMover(
  before: Record<string, number>,
  after: { itemId: string; lastPrice: number }[],
): MarketMover | null {
  let best: MarketMover | null = null;
  for (const m of after) {
    const start = before[m.itemId];
    if (!start || start <= 0 || !m.lastPrice || m.lastPrice <= 0) continue;
    const pct = (m.lastPrice - start) / start;
    if (best === null || Math.abs(pct) > Math.abs(best.pct)) {
      best = { itemId: m.itemId, startPrice: start, endPrice: m.lastPrice, pct };
    }
  }
  return best && Math.abs(best.pct) >= 0.03 ? best : null;
}

/** The biggest mover among items you actually HOLD — the personal complement to the market-wide
 * `biggestMover`. The headline says what the market did; this says what YOUR positions did while away.
 * Pure (just `biggestMover` over the held subset). */
export function heldMover(
  before: Record<string, number>,
  markets: { itemId: string; lastPrice: number }[],
  inventory: Record<string, number>,
): MarketMover | null {
  return biggestMover(before, markets.filter((m) => (inventory[m.itemId] ?? 0) > 0));
}

export interface OfflineResult {
  ticks: number;
  worthBefore: number;
  worthAfter: number;
  /** What the Sellsword hunted/banked while away (10l). */
  sellswordKills: number;
  sellswordBanked: number;
  /** The biggest market move while away — the "the world didn't sleep" headline (14y). */
  topMover: MarketMover | null;
  /** The biggest move among items you HOLD — what YOUR positions did while away (15x). */
  heldMover: MarketMover | null;
}

export interface OfflinePlan {
  ticks: number;
  worthBefore: number;
  sellswordKills0: number;
  sellswordBanked0: number;
  /** Per-item lastPrice captured before the away ticks ran — drives the top mover. */
  pricesBefore: Record<string, number>;
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
    pricesBefore: Object.fromEntries(before.markets.map((m) => [m.itemId, m.lastPrice])),
  };
}

/** Close out a plan after its ticks have run (however they were chunked). */
export function finishOfflineProgress(game: Game, plan: OfflinePlan): OfflineResult {
  const worthAfter = playerWorth(game);
  recordWorth(game, worthAfter);
  const after = playerView(game.world, game.playerId);
  return {
    ticks: plan.ticks,
    worthBefore: plan.worthBefore,
    worthAfter,
    sellswordKills: (game.world.stats.sellswordKills ?? 0) - plan.sellswordKills0,
    sellswordBanked: (game.world.stats.sellswordBanked ?? 0) - plan.sellswordBanked0,
    topMover: after ? biggestMover(plan.pricesBefore, after.markets) : null,
    heldMover: after ? heldMover(plan.pricesBefore, after.markets, after.inventory) : null,
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
