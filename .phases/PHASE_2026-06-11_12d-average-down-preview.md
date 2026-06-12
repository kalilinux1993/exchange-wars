# Phase: Exchange Wars — Phase 12d: Average-Down Buy Preview (Brick 108)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading — instrument the buy decision for items you already hold)
**Goal:** When buying an item you already hold a position in, the ticket previews the resulting blended average cost and whether you're averaging down / up / flat. UI-only, live on main.
**Done condition:** buy-side preview line (new units @ new avg, was-avg, signed direction) shown only when adding to a held position + valid qty/price; pure helper truth-table-tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Gap this fills
The arc started by 12c (see all your open positions) left the *next* decision blind: when you add to a position, the ticket showed the order cost but not how the buy moves your cost basis. "Am I averaging down or chasing?" required mental math. This previews the new quantity-weighted average before you place the offer — the decision tool for managing a position, not just opening one.

## Outcome
- `game.ts`: `blendBuy(open, addQty, addPrice)` → `BlendedBuy | null` — pure: new total units + blended avg cost + `delta` (avgCost − prevAvg, signed: <0 down / >0 up / 0 flat). Buys carry no GE tax (tax is sell-side), so the blend is raw cost / raw units, consistent with the FIFO book's lot prices. Returns null when there's no position to blend with (a fresh buy has no average to move) or the add is non-positive — so the preview only appears for the average-down/up case it's meant for.
- `TradeTicket.tsx`: a preview line under the order summary, shown only when `side === 'buy' && valid && blendBuy(position, q, p)` — `after this buy: N @ avg Y (was X) ↓ averaging down` (green) / `↑ averaging up` (dim) / `· avg unchanged`. Reacts live to the qty/price inputs.
- Tests (+3): `blendBuy` truth table (down 100→90, up 100→133 with rounding, flat 100→100; null for no-position and empty-add) + a ticket render test (held 10 @ 100, buy 1 @ 80 → "after this buy" + "averaging down" surface). 292/292 unit, 9/9 e2e. FINDINGS #142.

## Gates
- [x] `blendBuy` pure truth table (down/up/flat, null cases, rounding)
- [x] Ticket renders the preview only when adding to a held position
- [x] Typecheck + 292 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A matching "average-up cost to sell at break-even" hint on the sell side, if useful.
- Masthead paper-P&L surfacing (queued).
