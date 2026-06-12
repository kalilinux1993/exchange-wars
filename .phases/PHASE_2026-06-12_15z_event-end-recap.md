# Phase: Exchange Wars — Phase 15z: Event-End Recap (close the event lifecycle) (Brick 208)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — event lifecycle / market-news feedback)
**Goal:** When a world market event (shortage/craze/glut/slump) runs its course, fire a recap toast naming
how the item's price actually moved over the event — "⚡ {item} {label} ended · settled {start}→{end}
(±X%)" — closing the event lifecycle the way the dive recaps closed the dive (start chip → end recap).
**Done condition:** An event transitioning from active to ended fires a one-shot recap with its captured
start price vs the settled price; swap-safe (a game change doesn't recap the old game's events); suite + e2e green.

## Why this brick
The events system has a START surface (the 15l actionable chips: "⚡ {item} {label} · N left") but no
CLOSE — an event just silently expires, so you never learn whether the craze you traded paid off. That's
the same lifecycle gap 15n fixed for dives (death recap existed, the successful-extract recap didn't). A
recap that captures the price when an event begins and reports the move when it ends turns the event from
a transient chip into a readable arc. Fresh work in a system I've barely touched (only 15l).

## Design — a pure reconcile helper + thin App wiring (the celebration-detection pattern)
- `game.ts`: `reconcileEvents(captured, activeEvents, priceOf)` → `{ recaps, captured }`. Captures each
  newly-active event at its current price; for each previously-captured event no longer active, emits an
  `EventRecap {itemId, kind, startPrice, endPrice, pct}` and drops it from the map. Pure — the App holds
  `captured` in a ref.
- `App.tsx`: in `refreshProgress`, after the other detections: an identity swap-guard (reset the capture
  ref when `game` changes, so a cloud-adopt/restart never recaps the old game's events — the 14e/14f
  class), then call `reconcileEvents` with the active events + a `v.markets` price lookup, store the
  returned map, and `setToast` the last recap (last-writer-wins, like the other refreshProgress toasts).

## Scope (in)
- `game.ts`: `reconcileEvents` + `EventRecap` interface
- `App.tsx`: capture ref + swap-guard + reconcile call + recap toast
- `app.test.tsx`: `reconcileEvents` unit (capture-on-active, recap-on-end with price move, cleanup)

## Scope (out)
- Recap fires for ALL ended events (mirrors the chips showing all active ones), not just held/watched —
  events aren't frequent (minDuration 800, chance 0.35); held-scoping is a later tuning call if it's noisy.
- No engine change (events already live in `world.events`)

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `reconcileEvents` captures a newly-active event (no recap) and recaps it on end with the right ±% (+50% in the test)
- [x] the capture map cleans up ended events; a still-active event keeps its original start price; swap-guard in App resets on game change
- [x] UI suite (357, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reconcile is pure + testable; the swap-guard reuses the established identity-ref pattern.
