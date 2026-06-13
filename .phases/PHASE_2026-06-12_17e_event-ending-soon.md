# Phase: Exchange Wars — Phase 17e: Event "ending soon" urgency cue (Brick 239)

**Started:** 2026-06-12
**Hat:** Builder (trading feel — don't miss the closing window)
**Goal:** When an active market event is in its final stretch (≤150 ticks left), mark its newsbar chip
"ending soon" (amber + ⏳) — the price dislocation is about to revert, so the cue says act or close now.
**Done condition:** A chip for an event with ≤150 ticks left gets `.ending` + a ⏳ marker; longer-lived events
don't; suite + e2e green.

## Why this brick
Events (shortage/craze/crash) move prices for 800–2000 ticks, then the dislocation reverts. The chips show a
raw "N left" countdown, but nothing flags WHEN the window is actually closing — you can sit on an event
position past its peak and watch the edge evaporate. A "⏳ ending soon" amber state on the chip in the final
stretch is the act-now nudge, completing the event lifecycle cue (begin chip → ending cue → 15z end recap).
Pivoting to events for breadth after a run of watchlist/UX bricks.

## Design — a pure `eventEndingSoon` + an `.ending` chip state
- `game.ts`: `EVENT_ENDING_SOON_TICKS = 150` + `eventEndingSoon(ticksLeft): boolean` (`>0 && <=150`). Absolute
  threshold (not fractional) so "you have ~150 ticks to act" reads consistently across 800–2000-tick events.
- `App.tsx`: in the newsbar chip, compute `left = endTick - tick`; when `eventEndingSoon(left)` add the
  `ending` class + a ⏳ before "N left", and an act-now title.
- `styles.css`: `.event-chip.ending` (amber accent + subtle pulse).

## Scope (in)
- `game.ts`: `EVENT_ENDING_SOON_TICKS` + `eventEndingSoon`
- `App.tsx`: chip `ending` class + ⏳ marker
- `styles.css`: `.event-chip.ending`
- `app.test.tsx`: `eventEndingSoon` unit (boundary) + a render test (near-ending chip is marked)

## Scope (out)
- No chip re-SORTING by urgency (would make chips jump every tick) — mark in place only
- No engine change — no redeploy; no change to the 15z end recap or the masthead ⚡count

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] `eventEndingSoon` boundary (150 true, 151 false, 0/neg false); a ≤150-left chip renders `.ending` + ⏳ (far event stays normal)
- [x] UI suite (402, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — pure helper + a conditional class on an existing chip.
