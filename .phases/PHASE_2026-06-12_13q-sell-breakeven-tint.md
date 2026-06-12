# Phase: Exchange Wars — Phase 13q: Below-Break-Even Sell Tint (Brick 147)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading; loss-prevention at the input)
**Goal:** Tint the ticket's price field red when a sell would land below break-even.
**Done condition:** the price input goes red (+ a title) when side=sell and the typed price is under `breakEvenSell(avgCost)`; UI suite + e2e green. **MET.**

## Why this brick
The ticket already computed `breakEvenSell` and showed a "break-even ≥ X · below break-even" readout — but the warning lived below the field, easy to miss while typing a price. A sell under break-even is a guaranteed loss after the 2% tax. Tinting the INPUT itself catches the mistake where it's made.

## Design — reuse breakEvenSell, hoist the flag to the field
- Hoisted `sellFloor = side==='sell' && position ? breakEvenSell(position.avgCost, GE_TAX_RATE) : null` and `belowFloor = sellFloor!==null && valid && p < sellFloor` into the component body (the existing readout keeps its own copy; the calc is pure and cheap).
- The price `<input>` gets `className="belowbe"` (red border + faint red fill) and an explanatory `title` when belowFloor. Complements (doesn't duplicate) the existing readout — the input is the surface where you set the price; the readout is the explanation.

## Outcome
- `TradeTicket.tsx`: `sellFloor`/`belowFloor` flag; conditional class + title on the price input.
- `styles.css`: `input.belowbe`.
- Tests (+1): a sell prefilled at 900 over a 1,000-avg-cost position (break-even ≈1,021) tints the input; the same at 1,100 does not.

## Gates
- [x] price field tints below break-even on a sell, clears above (render test, two prices)
- [x] UI suite (263, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- Same idea for buys that exceed a "rich" fair-value band (a soft "you're overpaying" tint).
