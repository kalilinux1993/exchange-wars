# Phase: Exchange Wars — Phase 19l: "N offers filled while away" in the welcome-back digest (Brick 298)

**Started:** 2026-06-13
**Hat:** Builder (close the idle-loop digest gap — the flipper's core away event was missing)
**Goal:** The "while you were away" banner reports net worth Δ, sellsword kills/banked, the top market mover,
your held mover, and deeds — but NOT whether your RESTING OFFERS FILLED. For a flipping game, "did my working
orders go through?" is the headline away question, and right now it's only inferable from cash. Since the
player agent is `policy:'idle'` while away (it takes NO engine action — the documented replay-correctness
invariant at App:256-258), a resting order can ONLY leave the book by FILLING, never by a cancel/re-place. So
a before/after open-order-id diff cleanly counts offers that completed while away.
**Done condition met:** yes — `OfflinePlan` captures `openOrderIds0` (resting order ids before the away
ticks); `OfflineResult` gains `ordersFilled` = count of those ids absent from the book afterward; the away
digest shows "· ✅ N offer(s) filled" when > 0; a unit test pins the diff; suite + e2e green; typecheck clean.

## Why this brick
A flipper rests buy/sell offers and leaves; market agents cross them while away. The digest's net-worth Δ
folds in the fill value but never says "3 of your offers filled" — the discrete, satisfying idle payoff. The
diff is exact and cheap because of the offline idle invariant: no player action offline ⇒ vanished order =
filled (not cancelled), so `openOrderIds0 − afterIds` = fully-filled count. Partial fills stay on the book
(same id) and aren't counted — "filled" means cleared, an unambiguous headline; the Δ already reflects partials.

## Design — snapshot order ids in the plan, diff at finish
- `game.ts` `OfflinePlan`: add `openOrderIds0: number[]`; `planOfflineProgress` sets it from
  `before.openOrders.map(o => o.id)` (captured before any away ticks run — survives the chunked catch-up).
- `OfflineResult`: add `ordersFilled: number`; `finishOfflineProgress` computes `afterIds =
  new Set(after.openOrders.map(o => o.id))`, `ordersFilled = plan.openOrderIds0.filter(id =>
  !afterIds.has(id)).length`.
- `App.tsx`: in the away banner, when `o.ordersFilled > 0`, render "· ✅ {n} offer{s} filled" (title: your
  resting offers that completed while the tab was closed).

## Scope (in)
- `packages/ui/src/game.ts`: `openOrderIds0` on OfflinePlan + `ordersFilled` on OfflineResult + the diff
- `packages/ui/src/App.tsx`: the "N offers filled" clause in the away digest
- `packages/ui/test/app.test.tsx`: a unit test pinning `finishOfflineProgress.ordersFilled` (one of two resting orders vanishes → 1)

## Scope (out)
- No partial-fill counting (cleared = the headline; Δ covers partials); no per-item fill breakdown (a count is
  the digest grain); no change to the live resting-fill toast (13b — that's the in-session path); no engine
  change → no redeploy. Relies on the offline idle invariant (already enforced/documented) — if automation ever
  acts offline, this count (and the replay) would need revisiting, same as the existing guard.

## Subsystems touched
- packages/ui/src/game.ts (OfflinePlan / OfflineResult / plan+finish)
- packages/ui/src/App.tsx (away digest)
- packages/ui/test/app.test.tsx

## Gates
- [ ] OfflinePlan.openOrderIds0 captured pre-away; OfflineResult.ordersFilled = vanished-id count — unit pinned
- [ ] away digest shows "✅ N offers filled" when > 0
- [ ] UI suite (+1) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — the offline idle invariant guarantees vanished = filled; ids are unique-increasing so no reuse.
