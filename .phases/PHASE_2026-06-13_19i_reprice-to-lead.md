# Phase: Exchange Wars — Phase 19i: one-click "reprice to lead" on a queued resting offer (Brick 295)

**Started:** 2026-06-13
**Hat:** Builder (turn the 19h diagnosis into an action — let a queued maker jump to the front of the book in one tap)
**Goal:** 19h tells a maker "N ahead — undercut to jump the queue," but acting on it means manually aborting
and re-entering the order at a better price. Add a one-click "reprice {target}" that cancels the offer and
re-places it at the queue-leading price (undercut the best competing ask by 1 for a sell, outbid the best bid
by 1 for a buy). Only shown when it's actionable AND safe.
**Done condition met:** yes — a pure `repriceTarget(world, order)` returns the lead price (null when already
leading / off-book / a sell would fall below 1); PlayerPanel shows a "reprice {target}" chip on queued offers
(BUY gated on re-escrow affordability so it never cancels-then-fails; SELL always re-escrows safely) that
fires `cancel` then `place` at the target; tests pin the helper + the click sequence; suite + e2e green;
typecheck clean.

## Why this brick — the payoff of 19h
Queue position (19h) is diagnostic; this is the fix. A maker who sees "3 ahead" wants to act, not re-type the
order. `command` is synchronous (App:733 — applies + logs to commandLog + re-renders), so a click can fire
`cancel` then `place` in order; both land in commandLog, so replay re-runs them identically (determinism
intact). The one hazard is a BUY whose re-place is unaffordable (you'd raise your bid, needing more escrow than
the cancel refunds) — that would cancel the order and fail to replace it, silently dropping your position. So
the BUY chip is gated on `(target − price)·remaining ≤ view.gp`; a SELL re-escrows the same item qty, so it's
always safe. The target price is shown ON the button — an informed click, like manual placement.

## Design — a pure target helper + a guarded action chip
- `game.ts` `repriceTarget(world, order)`: `book = world.books[itemId]`; `idx = sameSide.findIndex(id)`;
  `idx <= 0 → null` (off-book or already leading); `front = sameSide[0].price` (best competitor, since you're
  not index 0); `target = buy ? front+1 : front-1`; `target >= 1 ? target : null`. Structural `world` param
  (mirrors `orderAge`/`restingQueue`). Pure (display read).
- `PlayerPanel.tsx`: per resting offer, `target = repriceTarget(game.world, o)`; skip if null; for a BUY skip
  if `(target − o.price)·o.remaining > view.gp` (unaffordable re-escrow). Render a "reprice {target}" chip
  beside "abort" whose onClick fires `onCommand({type:'cancel', itemId, side})` then `onCommand({type:'place',
  itemId, side, price: target, qty: o.remaining})`.

## Scope (in)
- `packages/ui/src/game.ts`: `repriceTarget` helper
- `packages/ui/src/components/PlayerPanel.tsx`: the guarded "reprice" chip
- `packages/ui/test/app.test.tsx`: pin repriceTarget (sell undercut, buy outbid, leading/off-book/clamp→null) + a render+click test (cancel then place at target; buy affordability gate hides it)

## Scope (out)
- No break-even guard on sells (a 1-tick undercut is the player's informed click — the target price shows on
  the button; matches manual-placement freedom; noted as a possible follow-up); no repeated/auto undercut (one
  tap = one reprice); no new command type (cancel+place is the protocol); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/PlayerPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] repriceTarget: sell→front−1, buy→front+1, leading/off-book/below-1 → null — pinned
- [ ] reprice chip fires cancel then place at target (commandLog records both, replay-consistent); BUY hidden when re-escrow unaffordable
- [ ] UI suite (+~2) + e2e (13) green; typecheck clean
- [ ] UI-only — mutations via applyCommand only; no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Break-even floor on sell undercuts is deferred (needs cost basis); acceptable since the target price is shown before the click.
