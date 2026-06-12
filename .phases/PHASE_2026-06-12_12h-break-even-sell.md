# Phase: Exchange Wars — Phase 12h: Break-Even Sell Hint (Brick 112)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (trading — complete the ticket's decision symmetry with the sell-side mirror of 12d)
**Goal:** On the sell side, when holding a position, show the least price that recovers your average cost after the 2% sell tax — the break-even floor — and warn when the entered price is below it. UI-only, live on main.
**Done condition:** sell-side break-even line for a held position (exact under floor tax) + below-break-even warning; pure helper truth-table-tested incl. the floor-tax edge; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12d added an average-down preview on the BUY side; the ticket's sell side had no equivalent. Players routinely sell just above their average cost and lose money because the 2% tax eats the thin margin. The break-even floor makes the real "sell above this to profit" line explicit — the mirror that finishes the ticket's pre-trade instrumentation (buy: how it reshapes cost; sell: what clears it).

## The subtlety (why it's not avgCost / 0.98)
The GE tax is `floor(price * taxRate)` in integer gp, not a clean percentage. So `avgCost / (1 - taxRate)` overshoots: at avg 100, it gives 103, but 102 already clears (102 − floor(2.04)=2 → 100 = cost). `breakEvenSell` takes the ceil estimate as an upper bound, then tightens DOWN to the true least integer where `price - floor(price*taxRate) >= avgCost`. A property test pins this for several costs: the returned price recovers cost and one gp under does not.

## Outcome
- `game.ts`: `breakEvenSell(avgCost, taxRate)` — pure; ceil-estimate then tighten to the exact floor-tax break-even integer; 0 for a zero basis.
- `TradeTicket.tsx`: a sell-side line under the order summary (shown when `side==='sell' && position`): "break-even ≥ N/unit (avg X + 2% tax)", with a "· below break-even" warning when the entered price is under the floor. Mirrors the 12d buy-preview placement.
- Tests (+4): `breakEvenSell` exact values (100→102, 50→51, 1000→1020) + a property test (recovers cost, −1 doesn't) over five costs + zero-basis; a ticket render (flip to sell with a 10@100 position → "break-even ≥ 102"; set price 50 → "below break-even"). 314/314 unit, 9/9 e2e. FINDINGS #146.

## Gates
- [x] `breakEvenSell` pure incl. floor-tax exactness (property test)
- [x] Ticket shows break-even on the sell side for a held position + warns below it (render test)
- [x] Typecheck + 314 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Tint the sell price input green/red around the break-even line (currently a text warning only).
- Surface the trading scorecard (realized + paper) in the masthead (queued).
