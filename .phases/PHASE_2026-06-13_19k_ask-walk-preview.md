# Phase: Exchange Wars — Phase 19k: ask-walk buy-cost preview on the ticket (the buy-side mirror of bidWalk) (Brick 297)

**Started:** 2026-06-13
**Hat:** Builder (close the buy/sell symmetry — show what an aggressive buy ACTUALLY fills at, not just the escrow ceiling)
**Goal:** The sell side has `bidWalk` (what dumping into the bids nets, walking DOWN) and now `liquidateNow`
(19j). The BUY side has no counterpart: the ticket shows `cost = qty × your limit price`, which is the escrow
CEILING — but a buy that crosses the spread fills against resting asks at THEIR (cheaper) prices (≤ your
limit), so the real immediate cost is lower, and only part may fill (the rest rests at your price). Add
`askWalk(game, itemId, qty, maxPrice)` — walk the asks UP the book to the limit — and preview "fills ≈X now
for ≈C gp (avg A), Y rests" on a buy ticket.
**Done condition met:** yes — a pure `askWalk` mirrors `bidWalk` (walks `sells` ascending, skips the player's
own asks, stops once price exceeds the limit; buys are untaxed so it's gross gp, no net); the buy ticket shows
the immediate-fill preview when any of the order would cross the spread; tests pin the walk + cap + edges; a
ticket render test confirms the line; suite + e2e green; typecheck clean.

## Why this brick
"cost {qty × limit}" overstates an aggressive buy: the engine fills a limit buy at the resting SELL's price
(maker's price ≤ your limit), so a crossing buyer gets price improvement and pays less than the ceiling — and
if asks are thin, most of the order RESTS rather than fills. The player can't see either from "cost N gp." The
ask-walk preview answers "how much of this fills right now, at what real cost, and how much will rest?" — the
exact mirror of the sell-side "realize ≈net." Completes the spread-walk symmetry (down for sells, up for buys).

## Design — askWalk symmetric to bidWalk, capped at the limit
- `game.ts` `askWalk(game, itemId, qty, maxPrice)`: iterate `book.sells` (price ASC — cheapest first); skip
  `o.agentId === game.playerId` (no self-trade); `o.price > maxPrice → break` (asc ⇒ nothing further fills at
  the limit); take `min(remaining, o.remaining)`, accumulate `gp += take·price`, `ceil = o.price`. Return
  `{ qty: bought, ceil, gp } | null` (null when nothing crosses). No tax (paySeller taxes sellers; buyers pay
  gross) — so no net/gross split, unlike bidWalk.
- `TradeTicket.tsx`: when `side === 'buy'` and valid, `w = askWalk(game, selected, q, p)`; if `w`, render
  "fills ≈{w.qty} now · ≈{w.gp} gp (avg {round(w.gp/w.qty)}){q > w.qty ? `, ${q − w.qty} rests at ${p}` : ''}".

## Scope (in)
- `packages/ui/src/game.ts`: `askWalk` helper
- `packages/ui/src/components/TradeTicket.tsx`: the buy-side immediate-fill preview line
- `packages/ui/test/app.test.tsx`: pin askWalk (walk asc, cap at limit, own-skip, partial, null below best ask) + a ticket render test

## Scope (out)
- No tax (buys are untaxed — verified by paySeller being sell-side); no change to the "cost" escrow line (it's
  the correct ceiling); no market-order (uncapped) variant — the preview is tied to the entered limit so it
  can't imply fills the order won't take; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] askWalk: walks sells ascending, caps at maxPrice, skips own asks, partial fill when asks run dry, null when limit < best ask — pinned
- [ ] buy ticket renders "fills ≈X now · ≈C gp (avg A)" with the resting remainder when partial
- [ ] UI suite (+~2) + e2e (13) green; typecheck clean
- [ ] UI-only — display read of world.books; no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — symmetric to the verified bidWalk; buy-side untaxed is confirmed by paySeller (exchange.ts:72).
