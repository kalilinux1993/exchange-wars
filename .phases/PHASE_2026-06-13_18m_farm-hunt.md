# Phase: Exchange Wars — Phase 18m: Make the ticket's farm line actionable (hunt → jump) (Brick 273)

**Started:** 2026-06-13
**Hat:** Builder (trading↔adventure — close the farm cross-reference's action loop)
**Goal:** The ticket's "🗡 farm: {monster} {chance}% · {region}" line (15v) tells you a tradeable item is also
a monster drop, but it's read-only. Add a "hunt" button that jumps to the Adventure tab with that region
pre-selected — "farm it instead of buying it," the trade→farm sibling of the bounty "hunt" (18f).
**Done condition met:** yes — a drop-item's farm line shows a "hunt" button that calls onHunt with the
source's region id; a staple (no source) shows nothing; without onHunt the line stays read-only; suite + e2e green.

## Why this brick
`itemSources` (15v) already resolves each drop's region and exposes `regionId` directly — the farm line shows
the monster + region but offers no way to GO there, the same dead-end the bounty board had before 18f. A
"hunt" button reusing `jumpToRegion` (the region nonce-pulse + `pickRoom('adventure')`, now its third caller
after the Delve-Log raid-again 12l and the bounty hunt 18f) closes the loop: looking at an item on the GE,
see it's farmable, one click to go farm it. No new helper — `top.regionId` is already on the source.

## Design — onHunt thread + a hunt button
- `TradeTicket.tsx`: optional `onHunt?(regionId)`. In the farm line, when `onHunt && top.regionId`, render a
  "hunt" chip → `onHunt(top.regionId)`; otherwise the line stays read-only (callers without onHunt unchanged).
- `App.tsx`: pass `onHunt={jumpToRegion}` to TradeTicket.

## Scope (in)
- `packages/ui/src/components/TradeTicket.tsx`: `onHunt` prop + the hunt button on the farm line
- `packages/ui/src/App.tsx`: pass `onHunt`
- `packages/ui/test/app.test.tsx`: extend the farm-line test — hunt calls onHunt with the source region id; no-onHunt → no button

## Scope (out)
- No auto-embark (jumps + pre-picks the region; you pack + embark — same restraint as bounty hunt); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] nature_rune farm line → "hunt" calls onHunt with the source regionId; staple (shark) → no farm line; no onHunt → no button — render test
- [x] UI suite (444, +1) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `jumpToRegion` (18f/12l) + `itemSources.regionId` (15v); mirrors the bounty-hunt pattern.
