# Phase: Exchange Wars — Phase 10l: Welcome Back, the Sellsword Worked (Brick 64)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (idle-game homecoming — the return summary is the dopamine)
**Goal:** The offline away-bar reports what the Sellsword hunted/banked while away, via a snapshot-diff of the 10k counters across the offline fast-forward. Pure UI.
**Done condition:** OfflinePlan snapshots + OfflineResult deltas + away-bar line + test; suite + e2e green. **MET.**

## Outcome
- game.ts: OfflinePlan gains sellswordKills0/Banked0 (snapshot in planOfflineProgress); OfflineResult gains sellswordKills/Banked deltas (finishOfflineProgress). App away-bar: "🗡 sellsword: N kills, X gp banked" when kills > 0.
- 203/203 unit (offline run with active sellsword → kills delta > 0); 9/9 e2e. No engine change (counters from 10k), no fn redeploy. FINDINGS #98.

## Gates
- [x] Offline delta reports sellsword activity (test)
- [x] Suite + e2e green
