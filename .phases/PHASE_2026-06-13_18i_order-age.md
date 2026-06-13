# Phase: Exchange Wars — Phase 18i: Order age + stale flag on resting offers (book hygiene) (Brick 269)

**Started:** 2026-06-13
**Hat:** Builder (trading — surface when a resting offer has gone stale)
**Goal:** On each Open Offer, show how long it's been resting ("rested {N}t") and amber-flag it `.stale` once
it's sat past a threshold without filling — the signal that a maker order is mispriced (the market moved
away) and should be re-priced or aborted. UI-only: the placement tick lives on the full `Order` in
`world.books` (the view projection omits it), read for display.
**Done condition:** an open offer shows its resting age; one resting ≥ the threshold gets a stale marker; a
fresh one doesn't; the age helper is unit-pinned; suite + e2e green.

## Why this brick
A flipper resting several maker offers has no way to tell a fresh order from one that's sat unfilled for ages.
A buy resting thousands of ticks below the moved-away market is dead capital — the player should re-price or
cancel it, but the Open Offers list shows only `remaining @ price`, no age. Adding "rested {N}t" + a stale
amber flag turns the offer list into a book-hygiene tool: spot the stale order, abort/re-price it. The data
is already in state — `Order.tick` (placement tick, the price-time tiebreaker) lives on the full order in
`world.books`; the `OpenOrderView` projection drops it, but the UI legitimately reads `world.books` for
display (e.g. `bidWalk`), so this is UI-only, no engine/view change.

## Design — a pure age helper + a flagged readout
- `game.ts`: `orderAge(world, order): number | null` — find the order by id in `world.books[itemId][side]`,
  return `max(0, world.tick − o.tick)`, or null if it isn't on the book (filled/cancelled mid-render).
  `STALE_ORDER_TICKS = 500` — past this, a maker offer that still hasn't filled is likely mispriced.
- `PlayerPanel.tsx`: per open offer, `const age = orderAge(game.world, o)`; render "· rested {age}t" (dim),
  and add a `.stale` class + a "⏳ stale — re-price or abort?" title when `age >= STALE_ORDER_TICKS`.

## Scope (in)
- `packages/ui/src/game.ts`: `orderAge` helper + `STALE_ORDER_TICKS`
- `packages/ui/src/components/PlayerPanel.tsx`: the age readout + stale flag on each open offer
- `packages/ui/test/app.test.tsx`: `orderAge` unit (found/absent) + a render test (fresh vs stale offer)

## Scope (out)
- No auto-re-price / auto-cancel-stale (surfaces it; the player acts — same restraint as the other nudges)
- No engine/view change (reads `world.books` for display); no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/PlayerPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] open offer shows "rested 600t"; aged ≥500 → `li.stale` (⏳); a fresh 100t offer → not stale — render test
- [x] `orderAge` unit-pinned (age by id; null on wrong-side/absent/no-book; floors at 0)
- [x] UI suite (440, +2) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reads `world.books` (display-allowed); `Order.tick` is plain-JSON state already present.
