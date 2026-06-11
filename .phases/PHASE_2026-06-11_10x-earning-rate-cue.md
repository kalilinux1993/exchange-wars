# Phase: Exchange Wars — Phase 10x: Earning-Rate Cue (Brick 76)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (idle-game feedback — "am I winning right now?")
**Goal:** Surface a recent net-worth earning rate (gp/min) in the masthead, derived from the worth-history the chart already keeps — the trend signal the all-time delta can't give. UI-only, no engine change.
**Done condition:** pure `worthRate(history, window)` (windowed slope, honest nulls) with tests; a gp/min cue beside the net delta; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `worthRate(history, windowTicks=600)` — slope of the most recent ~10 min of throttled worth samples as gp/min (60 ticks = 1 min). Walks back collecting only in-window samples so old history can't skew the slope; returns null with <2 samples or a zero span.
- `App.tsx`: a `.rate` span in the purse after the cumulative delta — "▲ +N gp/min" up/down coloured, tooltip names the window via `fmtDuration`. Hidden when `worthRate` is null.
- `styles.css`: `.purse .rate` (small trend cue, help cursor).
- Tests: 3 pure `worthRate` (null guards; +/- slope; window clips old samples → measures the 500-tick span not 1000) + 1 masthead render (`+600 gp/min` shows from a 2-sample history). 235/235 unit (+4), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #110.

## Gates
- [x] worthRate slope + windowing + null guards (pure tests)
- [x] Rate cue renders in the masthead (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
