# Phase: Exchange Wars — Phase 21e: stale-offer dead-capital aggregate + safe bulk abort (Brick 323)

**Started:** 2026-06-13
**Hat:** Builder (trading — surface an aggregate the per-row flag lacks; the underwater-summary pattern for offers)
**Goal:** PlayerPanel flags each stale resting offer (⏳, 18i) but shows no AGGREGATE — a flipper with capital
locked across several stale offers (market moved away) can't see the total dead capital at a glance, the way
PositionsPanel shows "⚠ N underwater" (13n). Add the aggregate + a one-click to free it.
**Done condition met:** yes — a pure `staleOffers(world, openOrders)` returns the stale count, the gp idle in
stale BUYS (dead cash), and the itemId+side pairs that are ENTIRELY stale (safe to bulk-cancel); the Open
Offers header shows "⏳ N stale · ≈X gp idle" + an "abort stale" that cancels only those fully-stale pairs;
unit + render tests; suite + e2e green; typecheck clean.

## Design
- Pure `staleOffers`: stale = offers past `STALE_ORDER_TICKS` (age via the existing `orderAge`); `buyGpIdle`
  = Σ price·remaining over stale BUYS (sells lock items, not cash); `cancelPairs` = (itemId,side) pairs where
  EVERY open offer is stale — because `cancel {itemId, side}` cancels ALL offers of a pair, a pair shared with
  a FRESH offer is excluded (left for per-row handling) so the bulk abort can never kill a fresh offer.
- Header line + "abort stale" button (cancel-only — unconditionally safe, no re-place to fail, unlike reprice).
  Reuses the existing `.stale` amber + `chip danger`; no new CSS.

## Scope (in)
- packages/ui/src/game.ts (pure `staleOffers`)
- packages/ui/src/components/PlayerPanel.tsx (header aggregate + abort-stale)
- packages/ui/test/app.test.tsx (staleOffers units + PlayerPanel render)

## Scope (out — explicit non-goals)
- Bulk REPRICE (sequential gp/buy-limit depletion makes a bulk re-place unsafe — per-row reprice keeps its guards)
- A stale offer whose pair is shared with a fresh one still COUNTS + adds to gp idle, but isn't bulk-cancelable
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/{game.ts, components/PlayerPanel.tsx}
- packages/ui/test/app.test.tsx

## Gates
- [x] staleOffers: count + buyGpIdle (sells excluded) + cancelPairs (only fully-stale pairs)
- [x] PlayerPanel shows "⏳ N stale · ≈X gp idle"; "abort stale" cancels each fully-stale pair
- [x] typecheck clean; UI suite 506 (+4); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- Could also show items-idle for stale sells, but gp-idle (buys) is the clearer dead-cash signal — defer.
