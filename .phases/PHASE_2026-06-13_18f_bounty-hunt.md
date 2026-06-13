# Phase: Exchange Wars — Phase 18f: Make a not-done bounty actionable (hunt → jump to the region) (Brick 266)

**Started:** 2026-06-13
**Hat:** Builder (side-board — turn a dead-end into one click)
**Goal:** On a not-done bounty, replace the passive "hunting…" span with a "hunt" button that jumps to the
Adventure tab with the target's shallowest region pre-selected — the bounty sibling of the contract "buy {N}"
(17y) and the event-chip jump (15l). Reuses App's `jumpToRegion` (the nonce pulse the Delve Log "raid again"
already uses) and a new `huntRegionId` (the id-returning sibling of `monsterRegions`).
**Done condition met:** yes — a not-done bounty shows "hunt" → onHunt(regionId); a done one still shows
"claim"; without onHunt it falls back to "hunting…"; suite + e2e green.

## Why this brick
17x gave bounties their WHERE (the region name suffix), but a not-done bounty's only state was a passive
"hunting…" — you read where to go, then manually switched to Adventure and picked the region. That's the same
dead-end the not-ready contract had before 17y. A "hunt" button that pre-selects the target's region closes
the see→act loop the contract "buy {N}" (17y) and the event chips (15l) already close: a kill order should
take you to the hunt, not just describe it. The jump already exists (`jumpToRegion` = region nonce pulse +
`pickRoom('adventure')`, built for the Delve Log "raid again" 12l) — this is its second caller.

## Design — a hunt button + an onHunt thread + an id helper
- `game.ts`: `huntRegionId(monsterId)` — the id of the shallowest region the monster spawns in (pool or
  elite), or null. The id-returning sibling of `monsterRegions` (names); both walk REGIONS depth-order.
- `BountyBoard.tsx`: optional `onHunt?(regionId)`. Not-done + onHunt + a placeable region → "hunt" button →
  `onHunt(huntRegionId(monsterId))`; not-done + no onHunt/no region → the existing "hunting…" fallback;
  done → "claim" unchanged.
- `App.tsx`: pass `onHunt={jumpToRegion}` (reuses the Delve Log jump).

## Scope (in)
- `packages/ui/src/game.ts`: `huntRegionId` helper
- `packages/ui/src/components/BountyBoard.tsx`: `onHunt` prop + the contextual hunt button
- `packages/ui/src/App.tsx`: pass `onHunt`
- `packages/ui/test/app.test.tsx`: `huntRegionId` unit + a hunt-jumps render test + a no-onHunt fallback test

## Scope (out)
- No auto-embark (jumps + pre-picks the region; you still pack + embark — same restraint as the contract "buy {N}")
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/BountyBoard.tsx
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] not-done bounty → "hunt" calls onHunt with the target's shallowest region id; done → "claim"; no-onHunt → "hunting…"
- [x] `huntRegionId` unit-pinned (shallowest id for a multi-region foe; null for an unknown monster)
- [x] UI suite (436, +3) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the established jump (`jumpToRegion`) + the `monsterRegions` data, mirroring the 17y contract pattern.
