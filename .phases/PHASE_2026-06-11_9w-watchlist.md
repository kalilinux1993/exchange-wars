# Phase: Exchange Wars — Phase 9w: Watchlist (Brick 49)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading QoL — track YOUR items, distinct from Movers)
**Goal:** Star items from the ticket; a Watchlist panel in the Exchange shows them with live price + trend vs EMA, click-to-load, ×-to-unstar. localStorage-backed, shared state in App.
**Done condition:** star toggle + panel shipped with a test; suite + e2e green. **MET.**

## Outcome
- game.ts loadWatch/saveWatch ('ew-watch', cap 30); App watch state + toggleWatch (lifted, persisted).
- TradeTicket: ★/☆ watchstar in the header (aria-pressed). WatchlistPanel: row format mirrors Movers; click→select, ×→unstar.
- 195/195 unit (star→appears→unstar→gone); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #83.

## Gates
- [x] Star/unstar round-trips through the panel (test)
- [x] Suite + e2e green
- [next] Brick 50 = consolidation (standing loop rule #67)
