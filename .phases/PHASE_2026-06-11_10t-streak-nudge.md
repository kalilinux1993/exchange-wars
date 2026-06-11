# Phase: Exchange Wars — Phase 10t: Streak-at-Risk Nudge (Brick 72)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (retention — close the streak loop's FOMO half)
**Goal:** When a streak is one day from breaking and the player is NOT on today's daily, show a loud "keep your streak" CTA that loads the daily. UI-only, no engine change.
**Done condition:** pure `streakAtRisk` predicate (span-1 only); CTA shown off-daily when at risk, pre-filling the daily seed via soft-confirm; tests; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `streakAtRisk(streak, today)` = `streakDaySpan(lastDay, today) === 1` — reuses the same UTC day helper as `bumpStreak`, so advance + at-risk share one definition of "a day". span 0 (played today) and span ≥2 (dead) both → false; only the genuine one-day window is at risk.
- `App.tsx`: a `.streaknudge` button in the masthead, gated on `streakAtRisk(streak, dailySeed()) && world.seed !== dailySeed()`; click pre-fills the seed-draft with today's daily (same soft-confirm as the daily button — can't nuke a run).
- `styles.css`: `.streaknudge` louder pulsing orange CTA (it's a button, not a passive pill), `prefers-reduced-motion` guarded.
- Tests: 4 pure `streakAtRisk` (span 1 true / span 0 false / span ≥2 false / null false) + 2 render (CTA shows off-daily and pre-fills the daily seed on click using `dailySeed(now − 86_400_000ms)` as yesterday; absent on the daily). 221/221 unit (+6), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #106.

## Gates
- [x] streakAtRisk true only for the span-1 window (test, all four cases)
- [x] CTA shows off-daily + pre-fills daily seed; absent on the daily (render tests)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
