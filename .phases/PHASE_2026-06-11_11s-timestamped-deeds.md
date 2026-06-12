# Phase: Exchange Wars — Phase 11s: Timestamped Deeds (Brick 97)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (progression feedback — when, not just what)
**Goal:** Record the world tick each milestone is earned and surface a "🏅 latest deed · Nm ago" line in the Deeds panel. UI-only, additive, live on main.
**Done condition:** optional `milestoneTicks` stamped in `checkMilestones`; panel shows the latest earned deed + timing; suite + e2e green. **MET.**

## Outcome
- `game.ts`: optional `Game.milestoneTicks?: Record<string, number>`; `checkMilestones` stamps `[id] = game.world.tick` at the latch; `newGame` inits `{}`; `normalizeGame` defaults `{}` (old saves read undefined, guarded).
- `components/MilestonesPanel.tsx`: a "🏅 latest: <name> · {fmtDuration(now − tick)} ago" line (most-recently-stamped earned deed), between the badge grid and the next-goals list.
- Optional (not required) field → zero migration churn (no manual `Game` literal in tests needed touching, unlike the required `tradeBook` in 11o).
- Tests: stamp at the source (`monstersSlain=1` → 'first-blood' latched → `milestoneTicks['first-blood']===tick`) + panel render (earned tick 0, now 600 → "10m ago"). 268/268 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #131.

## Gates
- [x] checkMilestones stamps the earn tick (pure test)
- [x] Latest-deed line renders with timing (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
