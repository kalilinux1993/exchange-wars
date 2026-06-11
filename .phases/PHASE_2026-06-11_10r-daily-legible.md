# Phase: Exchange Wars — Phase 10r: Daily, Legible (Brick 70)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (discoverability — close the loop on 10q's daily seed)
**Goal:** Make "you're on today's daily" visible at the existing focal point (the clock), so the social hook (your score lands on today's board) is perceivable. UI-only, no engine change.
**Done condition:** a "🗓 today" badge next to the seed, shown exactly when `world.seed === dailySeed()`; test pins both directions; suite + e2e green. **MET.**

## Outcome
- `App.tsx`: a `.dailytag` pill ("🗓 today") rendered in the clock immediately after the seed value, gated on `game.world.seed === dailySeed()`. Tooltip explains the shared-world / today's-board meaning. Derived purely at render — no state, self-heals at UTC midnight.
- `styles.css`: `.dailytag` gold pill matching the GE masthead, subtle `dailytag-glow` keyframe, `prefers-reduced-motion` guarded.
- Test: badge shows for `newGame(dailySeed())`, absent for `newGame(42)` (a plain seed can't collide with the 8-digit daily). Distinct text from the "🗓 daily" button so no locator collision.
- 207/207 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #104.

## Gates
- [x] Badge shows iff active seed == today's daily (test, both directions)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
