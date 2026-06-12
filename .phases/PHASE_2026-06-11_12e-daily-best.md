# Phase: Exchange Wars — Phase 12e: Daily Personal Best (Brick 109)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (retention — give the daily a personal high score to chase, pivoting off the trading run for breadth)
**Goal:** Track and surface the best net worth ever reached on today's daily seed — a persisted record to beat across restarts. UI-only, live on main.
**Done condition:** masthead 🏁 tag on the daily showing the best-to-beat, "▲" when at a new peak, persisted in localStorage, hidden off the daily / before any progress; pure helpers truth-table-tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
Five-plus bricks running had all been trading (sell-alerts, content merge, positions panel, average-down). NEXT_STEPS explicitly flagged "pivot to another system for breadth." The daily/retention loop had a queued, self-contained gap: the daily had a streak ember and a shared board, but no *personal* record — the single most proven retention hook (chase your own high score). It reuses the existing daily-seed infra (`dailySeed()` as the day key) with zero engine contact.

## Outcome
- `game.ts`: `recordDailyBest(prev, today, worth)` → `DailyBest {day, best}` — pure, mirrors `bumpStreak`'s same-ref-when-unchanged contract so the localStorage write only fires on a genuine new high or a new day (not every tick, though worth moves most ticks). `dailyBestView(best, today, worth, startGp)` → `{best, atPeak} | null` — the display decision kept pure (hidden off the record's day or before any progress past the start; `atPeak` true while worth ≥ best, i.e. you're setting a record right now).
- `App.tsx`: `ew-daily-best` pref + an effect (keyed on `tick`/`seed`, guarded to the daily) that feeds `recordDailyBest`; a masthead 🏁 tag (built from `dailyBestView`) beside the 🗓/🔥 tags, with a green ▲ at a new peak. `playerWorth(game)` is the worth measure (same as the scorecard).
- `styles.css`: `.besttag` — emerald pill, distinct from the gold daily tag and orange streak ember.
- Tests (+8): `recordDailyBest` (first-play, running-max, same-ref-on-no-high, new-day-reset) + `dailyBestView` (hidden off-day / at-baseline; shown with atPeak true/false) + two render tests (🏁 shows on the daily with a seeded record; hidden off the daily). 300/300 unit, 9/9 e2e. FINDINGS #143.

## Gates
- [x] `recordDailyBest` pure (first/max/same-ref/new-day-reset)
- [x] `dailyBestView` pure (hide rules + atPeak)
- [x] 🏁 renders on the daily / hidden off it (render tests)
- [x] Typecheck + 300 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A one-time "🎉 new daily record!" toast when you first surpass the incoming best this session (vs the always-on ▲).
- "today's board" framing on the leaderboard view (the last leftover daily-polish item).
