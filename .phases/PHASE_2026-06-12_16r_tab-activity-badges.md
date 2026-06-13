# Phase: Exchange Wars — Phase 16r: Tab activity badges (cross-room awareness) (Brick 226)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — notification persistence / cross-room awareness)
**Goal:** Flag a room's tab with a dot when something notable happens there while you're on a DIFFERENT
tab — a resting fill or price/band alert (Exchange) or a new deed (Hall) — a persistent cue for the
transient toast you might have missed while heads-down elsewhere; cleared when you visit the tab.
**Done condition:** A badge appears on the Exchange/Hall tab when its event fires off-tab, and clears on
visiting it; the marking decision is a pure tested helper; suite + e2e green.

## Why this brick
Toasts are last-writer-wins and transient (4s) — heads-down on the Adventure tab, you can miss "your order
filled" or "a deed earned." A tab dot is the persistent complement: it sits until you look. The cleanest
genuine UX gap left — cross-room awareness — for a multi-room app where the events that matter on one tab
fire while you're on another. Pairs with (doesn't replace) the toast: the toast says it NOW, the dot says
it's STILL there to see.

## Design — a pure mark helper + thin App wiring
- `game.ts`: `markRooms(prev, fired, active)` → next badge map; flags a room ONLY when its event fired and
  it isn't the active room and isn't already flagged; returns the SAME object when nothing changes (so the
  caller can bail the re-render). Pure, string-typed.
- `App.tsx`: a `roomRef` (current room, stale-closure-safe) + an `unseen` state. In `refreshProgress`, set
  `firedExchange` (fills / any price/sell/band/rich alert / event-recap) and `firedHall` (a new deed), then
  once at the end `setUnseen(u => markRooms(u, {exchange,hall}, roomRef.current))`. `pickRoom(r)` clears
  `unseen[r]`. Each tab renders a `.tabdot` when its room is flagged.
- `styles.css`: `.tabdot`.

## Scope (in)
- `game.ts`: `markRooms`
- `App.tsx`: `roomRef` + `unseen` state + the fired flags + `markRooms` call + clear-on-`pickRoom` + the tab dot
- `app.test.tsx`: `markRooms` unit (off-tab flags; active room doesn't; already-flagged returns same ref; nothing-fired no-op)

## Scope (out)
- No Adventure badge (dives are initiated from the Adventure tab — you're already there); no per-event
  detail/count (a single dot per tab); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] `markRooms` flags off-tab events only, skips the active room + already-flagged (same-ref), no-ops when nothing fired (5 cases pinned)
- [x] the Exchange/Hall tab renders a `.tabdot` when `unseen[room]`; `pickRoom` clears it on visit
- [x] UI suite (377, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — `markRooms` is the testable core; the App wiring is thin.
