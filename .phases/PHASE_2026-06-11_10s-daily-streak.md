# Phase: Exchange Wars — Phase 10s: Daily Streak (Brick 71)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (retention — the daily's recurring hook)
**Goal:** Reward consecutive daily plays with a streak counter (Wordle-style), persisted locally, surfaced as a 🔥 ember beside the daily badge. UI-only, no engine change.
**Done condition:** pure `bumpStreak` reducer with full truth-table tests; an effect that advances it once per UTC day when on the daily; a 🔥 pill in the clock; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `DailyStreak` ({count,lastDay,best}) + pure `bumpStreak(prev, today)` — today passed in (no clock read), idempotent same-day (returns same ref), +1 next day, reset-to-1 on any gap, `best` preserved. Day-gap via `Date.UTC(y,m-1,d)` diff so month/year rollover is correct (private `streakDaySpan`).
- `App.tsx`: `usePref<DailyStreak|null>('ew-daily-streak', null)`; an effect keyed on `world.seed` that calls bumpStreak when `seed === dailySeed()` (idempotency makes "fire on every seed change" safe); a `.streaktag` 🔥 pill in the clock shown only on the daily, tooltip names the count/best.
- `styles.css`: `.streaktag` ember pill (orange/red) pairing with the gold `.dailytag`.
- Tests: 6 pure bumpStreak cases (fresh/same-day-idempotent/consecutive/month+year-roll/skip-reset/backwards) + 2 render (ember lights + persists on the daily, absent off it). 215/215 unit (+8), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #105.

## Gates
- [x] bumpStreak truth table (incl. rollover + reset + idempotency)
- [x] Ember shows + persists on the daily, absent off it (render tests)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
