# Phase: Exchange Wars — Phase 19q: sell-side immediate-fill preview on the ticket (completes the 19k symmetry) (Brick 303)

**Started:** 2026-06-13
**Hat:** Builder (finish the buy/sell symmetry 19k started — the sell ticket lacks the immediate-fill read)
**Goal:** 19k gave the BUY ticket an `askWalk` "fills ≈X now · ≈C gp" preview. The SELL ticket shows only
"after 2% tax {proceeds}" — which uses your LIMIT price × qty. But a limit sell that crosses the spread fills
against the resting BIDS at their (higher) price (≥ your limit), so you net MORE than that figure, and the rest
rests. Add the symmetric `bidWalk` preview: "fills ≈X now · ≈Y net". `bidWalk` already walks the bids with
per-fill tax (verified 18p) but with no floor (the "dump at market" form `liquidateNow` uses) — add an optional
`minPrice` floor (default 0 = unchanged) so the ticket can cap the walk at the entered limit.
**Done condition met:** yes — `bidWalk(game, itemId, qty, minPrice=0)` breaks once a bid drops below the floor
(bids are price-desc); the SELL ticket shows the immediate-fill net preview when the order crosses; existing
no-floor callers (PlayerPanel dump, `liquidateNow`) are byte-identical; tests pin the floor + the render.

## Why this brick
The buy/sell symmetry is a recurring quality lens this session (19j/19k). 19k made the BUY ticket honest about
immediate fill cost; the SELL ticket still implies you only get your limit price when crossing actually pays
the higher resting bid (price improvement) net of tax. Showing the real immediate net — and how much rests —
completes the pair, reusing the verified `bidWalk` per-fill-tax engine mirror at the ticket scope.

## Design — minPrice floor on bidWalk + a sell fill preview
- `game.ts` `bidWalk(game, itemId, qty, minPrice = 0)`: add `if (o.price < minPrice) break;` after the
  `remaining<=0` check (bids sorted price-DESC → once below the floor, nothing qualifies). Default 0 ⇒ no
  floor ⇒ `liquidateNow` and the PlayerPanel "sell @ bid" dump are unchanged.
- `TradeTicket.tsx` (import `bidWalk`): a `side === 'sell' && valid && game` block mirroring the buy askWalk —
  `w = bidWalk(game, selected, q, p)`; if `w`, "fills ≈{w.qty} now · ≈{w.net} net (avg {round(w.net/w.qty)})"
  + a "{q − w.qty} rests at {p}" tail when partial. Net is after the 2% tax (bidWalk already applies it).

## Scope (in)
- `packages/ui/src/game.ts`: `minPrice` floor on `bidWalk`
- `packages/ui/src/components/TradeTicket.tsx`: the sell-side immediate-fill preview (+ import bidWalk)
- `packages/ui/test/app.test.tsx`: bidWalk minPrice cap (partial below the floor; default 0 unchanged) + a ticket sell render test

## Scope (out)
- No change to the "after 2% tax" sums line (it's the correct resting-limit expectation, the ceiling's mirror);
  no change to existing bidWalk callers (default minPrice keeps them identical); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts (bidWalk)
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] bidWalk(…, minPrice) stops at the floor; minPrice=0 (default) byte-identical to before — pinned
- [ ] sell ticket renders "fills ≈X now · ≈Y net" when the sell crosses; rests-tail when partial
- [ ] UI suite (+~2) + e2e (13) green; typecheck clean
- [ ] UI-only — display read of world.books; no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — bidWalk's per-fill tax is verified (18p); this only adds a price floor and a symmetric render.
