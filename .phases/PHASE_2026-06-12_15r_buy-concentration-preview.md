# Phase: Exchange Wars — Phase 15r: Pre-Buy Concentration Preview (Brick 200)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — pre-trade risk instrumentation)
**Goal:** Preview position concentration at the BUY decision point — "after this fills, {item} would be
X% of your liquid holdings" with a ⚠ when it crosses the concentration line — so the risk lens that
PositionsPanel shows post-hoc is visible *before* you commit, like blend/gear-delta/break-even already are.
**Done condition:** A buy with a valid price/qty shows an after-fill concentration % (risk-coloured,
reusing the PositionsPanel thresholds); suite + e2e green.

## Why this brick
The ticket is densely pre-instrumented on the BUY side: avg-cost blend (12d), gear delta (13z-era),
break-even on sell (12h). But the one risk that bites a flipper — dumping too much of your worth into a
single item — is only shown *after* the fact, on PositionsPanel's allocation bar (12k). Concentration is
a decision you make at the BUY: a preview "this buy would make {item} 60% of your holdings ⚠" belongs next
to the cost line, the same place blend already previews the post-fill average. Closes the ticket's risk
instrumentation: cost (how much), blend (what it does to your average), and now concentration (what it does
to your exposure).

## Design — a pure helper + one ticket line
- `game.ts`: `buyConcentration(view, itemId, addCost)` → `{ itemValue, worth, pct } | null`. `worth` =
  cash (`view.gp`) + held goods marked at `lastPrice` (= your liquid holdings; unchanged by a buy, which
  just swaps cash→goods). `itemValue` = this item's held value + the gp you'd commit (`addCost`). `pct` =
  `itemValue/worth` clamped [0,1]. `null` when worth ≤ 0. Sum of integer products → order-independent.
- `TradeTicket.tsx`: on `side === 'buy' && valid`, a "after fill: {item} ≈ X% of holdings" line, coloured
  with the PositionsPanel risk thresholds (`>0.5` red + ⚠ concentrated / `≥0.34` dim / else green).

## Scope (in)
- `game.ts`: `buyConcentration` + `BuyConcentration` interface
- `TradeTicket.tsx`: the concentration preview line (buy side)
- `app.test.tsx`: `buyConcentration` unit (a half-worth buy → ~50%) + a ticket render assert

## Scope (out)
- No open-order valuation in `worth` (mid-flight; keep the basis cash+held-goods, label it "holdings");
  no sell-side concentration (selling REDUCES exposure — not a risk to flag); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] a buy committing ~half your liquid worth into a fresh item reads ~50% (worth unchanged by the swap — corrected a wrong first test expectation, helper was right)
- [x] the line is risk-coloured (>50% red + ⚠) reusing the PositionsPanel thresholds
- [x] UI suite (346, +4: 3 buyConcentration units + 1 ticket render) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `view` data already in the ticket and the existing concentration thresholds.
