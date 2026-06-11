# Phase: Exchange Wars — Phase 9u: Price Sparkline (Brick 47)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading-side polish — see the trajectory before entering)
**Goal:** A sparkline of the selected item's recent trade prices in the ticket, derived from state.trades (no new state, no engine change), coloured by net direction, graceful <2-point fallback.
**Done condition:** sparkline shipped with a test; suite + e2e green. **MET.**

## Outcome
- Sparkline.tsx (generic number[] → polyline, up/down colour); TradeTicket renders it under the event note; App passes recentPrices = trades.filter(selected).map(price).slice(-48).
- Fixed an a11y collision (FINDINGS #81): aria-label "recent price trend" matched getByLabelText(/price/i) and doubled the price input → 4 test failures; renamed to "recent trend".
- 193/193 unit; 9/9 e2e. No engine change, no fn redeploy.

## Gates
- [x] Sparkline draws ≥2 points / falls back gracefully (test)
- [x] Suite + e2e green
