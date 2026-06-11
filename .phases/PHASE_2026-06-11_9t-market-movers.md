# Phase: Exchange Wars — Phase 9t: Market Movers (Brick 46)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (feed the trading half — a "where's the action" glance)
**Goal:** A Movers panel in the Exchange room ranking traded items by lastPrice-vs-EMA deviation: top-3 hot / bottom-3 cold, click-to-load into the ticket. Pure derived display, no engine change.
**Done condition:** panel + click-select shipped with a test; suite + e2e green. **MET.**

## Outcome
- MoversPanel.tsx (volume>0 & ema>0 filter; (last−ema)/ema sort; hot/cold sections; % badges; click → onSelect). Wired into the Exchange room's first column; styles for .mover/.pct.
- Reacts to events (craze→hot, glut→cold) for free.
- 192/192 unit (component spy test — avoided fragile cross-component text assertion); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #80.

## Gates
- [x] Movers render + click selects (spy test)
- [x] Suite + e2e green
