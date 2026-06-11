# Phase: Exchange Wars — Phase 8f: Dual-Metric Sprint Board (Expeditions Brick 6)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc — verified adventuring)
**Goal:** The 2k sprint replay already proves expeditions (commands don't tick the world) — so the verifier now also reports `deepestRegion`, the board stores it, and rows show how deep each trader dared by tick 2,000. One replay, two verified metrics; zero extra CPU.
**Done condition:** ReplayResult/SprintVerdict carry `deepest`; leaderboard table gains the column (management SQL); function stores it; board renders it; tests; fn redeployed; gates green; CI + live.

## Scope (in)
- replay.ts: deepest in results; verify-score upsert + SQL alter; BoardRow/fetch/panel depth display
- Tests: replay carries deepest after an expedition; board renders depth

## Scope (out)
- Separate depth-ranked ordering (worth stays the ranking; depth is displayed glory)

## Gates
- [ ] typecheck + unit + e2e green; fn redeployed + SQL applied
- [ ] CI green + live verified
