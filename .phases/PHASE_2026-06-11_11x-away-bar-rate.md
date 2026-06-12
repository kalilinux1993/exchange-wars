# Phase: Exchange Wars — Phase 11x: Away-Bar Rate & Compaction (Brick 102)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (idle-game feedback — was my offline setup productive?)
**Goal:** Enrich the offline away-bar with an earning rate (gp/min) and compact the big numbers. UI-only, live on main.
**Done condition:** away-bar shows "≈X/min" when growing + `fmtCompact` on the delta/sellsword gp; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `offlineRatePerMin(delta, ticks)` — gp/min from an offline worth delta (1 offline tick ≡ 1 second), 0 when no time passed.
- `App.tsx`: away-bar reworked as an IIFE — worth delta via `fmtCompact` (exact in the title), "· ≈{fmtCompact(perMin)}/min" shown only when `delta > 0`, sellsword banked gp via `fmtCompact`.
- Tests: pure `offlineRatePerMin` (60k/10min → 6k; losses negative; zero-ticks → 0). The away-bar render is exercised by the existing away-banner test (non-deterministic delta → can't assert the rate value, so logic is the pure test). 276/276 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #136.

## Gates
- [x] offlineRatePerMin converts delta→gp/min (pure test)
- [x] Away-bar renders with rate + compaction (existing away-banner render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
