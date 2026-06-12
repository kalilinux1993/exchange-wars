# Phase: Exchange Wars — Phase 11u: One-Click Sell Your Position (Brick 99)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading UX — exit-side round-trip symmetry)
**Goal:** A one-click "sell my whole holding" on the ticket's cost-basis line (the mirror of the one-click buy flip). UI-only, live on main.
**Done condition:** a "sell N" chip loads side=sell, qty=full position, price=ask−1 into the ticket; suite + e2e green. **MET.**

## Outcome
- `components/TradeTicket.tsx`: a "sell {units}" chip in the position line (11i) — sets the ticket's own `side`/`price`/`qty` state directly (`setSide('sell')`, `setPrice(max(1, (bestAsk ?? lastPrice)−1))`, `setQty(units)`). No prefill plumbing: the trigger is inside the ticket, which already owns the state + has `market`/`position` in scope. Fixed the stale "(recent fills)" tooltip → lifetime since 11o.
- Mirrors 11d's one-click buy → completes the round-trip (buy a flip ↔ sell a holding).
- Tests: open position 7 @ 100 → click "sell 7" → side toggle 'active', qty input = 7. Button labelled "sell N" so `getByText('sell')` still finds only the side toggle. 270/270 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #133.

## Gates
- [x] One-click loads a full-position sell (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
