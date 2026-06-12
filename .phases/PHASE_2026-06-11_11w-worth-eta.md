# Phase: Exchange Wars — Phase 11w: Worth ETA Projection (Brick 101)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (idle-game feedback — a forward-looking countdown)
**Goal:** Project "at your gp/min rate, ≈Xm to {next round number}" on the Fortune chart. UI-only, live on main.
**Done condition:** pure `nextRoundTarget`; chart shows the ETA only while growing; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `nextRoundTarget(n)` — the next 1/2/5×10^k strictly above n (55k→100k, 1.2M→2M, 6M→10M, 200k→500k, <1→1).
- `components/WorthChart.tsx`: computes `worthRate(history)` + `nextRoundTarget(last)` from its own history; subtitle shows "· ≈{fmtDuration(etaMin·60)} to {fmtCompact(target)}" only when `perMin > 0`. No new prop — derived from the history the chart already holds.
- Tests: pure `nextRoundTarget` ladder (incl. 150k→200k, 0.5→1) + render (5k/min from 150k → "≈10m to 200K"). 275/275 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #135.

## Gates
- [x] nextRoundTarget picks the next 1/2/5×10^k (pure test)
- [x] ETA renders while growing, vocabulary via fmtDuration/fmtCompact (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
