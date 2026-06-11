# Phase: Exchange Wars — Phase 10z: Adventurer's Record (Brick 78)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (rebalance — surface the RPG accomplishments to match the trading feedback)
**Goal:** A consolidated lifetime-records profile in the Hall, surfacing the SimStats the UI under-surfaced (eliteSlain, bountiesClaimed, contractsFilled, sellswordBanked, …). UI-only, no engine change.
**Done condition:** pure `recordRows(stats)` (zero-defaults, conditional sellsword rows, compacted gp) with tests; `RecordsPanel` in the Hall; suite + e2e green. **MET.**

## Outcome
- `components/RecordsPanel.tsx`: `recordRows(st: SimStats)` (pure) builds the record list — monsters slain / elites / bounties / bestiary met (X/Y) / deepest region name / caches / dice / contracts / deaths, plus sellsword kills + banked gp (compacted, exact tooltip) only once the hireling has acted. `RecordsPanel` renders them via `.panel`/`.rows small` (zero new CSS).
- `App.tsx`: `<RecordsPanel>` in the Hall's first `.middle`, between UpgradeShop and Almanac.
- Deliberately excluded sim-wide counters (`tradesTotal`/`ordersPlaced`) — they're the whole market, not the player's record.
- Tests: 2 pure `recordRows` (zero-defaults + sellsword hidden; compacted banked gp with exact title) + 1 render. 240/240 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #112.

## Gates
- [x] recordRows zero-defaults, hides/show sellsword rows, compacts banked gp (pure tests)
- [x] Panel renders in the Hall (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
