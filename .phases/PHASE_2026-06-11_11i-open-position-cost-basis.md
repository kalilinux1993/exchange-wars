# Phase: Exchange Wars — Phase 11i: Open-Position Cost Basis (Brick 87)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading — the unrealized half of P&L)
**Goal:** Show your average cost vs current price for the item you hold ("am I up?"), the unrealized counterpart to the realized ProfitPanel. UI-only, no save change, live on main.
**Done condition:** pure `openPosition` (FIFO leftover lots → units + avg cost) with tests; a cost-basis line in the ticket; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `openPosition(fills, itemId)` → `{units, avgCost}` or null — FIFO-matches sells against buys; the *leftover* buy lots are the open bought position, quantity-weighted avg. Excludes loot (no buy fill); window-bounded ("recent" basis).
- `components/TradeTicket.tsx`: new `position` prop; renders "position: N @ avg X · ±Y% now" (pct vs `market.lastPrice`, up/down coloured) after the depth bar.
- `App.tsx`: passes `position={openPosition(game.fills, selected)}`.
- Tests: 2 pure `openPosition` (leftover lots + weighted avg across two lots; null when fully sold / never bought / other item) + 1 App render (seed `game.fills` with a buy → ticket shows the line). 256/256 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #121.

## Context
- Chose this additive, zero-save-change signal over the bigger persistent-lifetime-P&L rewrite (still queued in NEXT_STEPS).

## Gates
- [x] openPosition leftover-lot avg + null boundaries (pure tests)
- [x] Cost-basis line renders in the ticket (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
