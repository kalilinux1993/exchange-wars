# Phase: Exchange Wars — Phase 18c: Flag an understocked loadout (the silent clamp made visible) (Brick 263)

**Started:** 2026-06-13
**Hat:** Builder (adventure — make a silent reduction visible)
**Goal:** A saved loadout chip should show a ⚠ when your current inventory can't fully stock it, so applying
it tells you it'll be reduced (and what's short) instead of silently clamping. `applyLoadout` already does
`Math.min(q, held)` and drops held=0 items — this surfaces what that clamp would quietly take.
**Done condition:** An understocked loadout chip shows ⚠ + a tooltip naming the shortfall (have/want per
item); a fully-stockable loadout shows neither; `loadoutShort` is unit-pinned; suite + e2e green.

## Why this brick
Loadouts (the embark draft's saved kits, capped at 4) refill the pack via `applyLoadout`, which clamps each
item to what you hold (`if (held > 0) next[id] = Math.min(q, held)`) and silently OMITS anything you've run
out of. So you save "3 shark + 1 antifire," burn through your sharks on a dive, tap the loadout next time,
and quietly get 1 shark and no antifire with no indication the kit came up short — you embark under-provisioned
believing you packed your saved kit. Surfacing the shortfall on the chip (a ⚠ + the have/want detail) turns a
silent reduction into an informed one, the honest counterpart to the clamp. A small, correct refinement to an
under-touched system (loadouts shipped but were never refined), pivoting off the leaderboard/review run.

## Design — a pure helper + a chip marker
- `game.ts`: `loadoutShort(loadout, inventory): { itemId; want; have }[]` — one entry per item where
  `loadout[id] > 0 && (inventory[id] ?? 0) < loadout[id]` (includes have=0), sorted by itemId (determinism).
  Empty when the kit fits. Pure — exactly the set the clamp silently reduces.
- `EmbarkPanel.tsx`: per loadout chip, `const short = loadoutShort(lo, view.inventory)`; append " ⚠" to the
  label + a `.short` class + a dynamic title naming the shortfall ("understocked: shark 1/3, antifire 0/1 —
  applies what you hold") when `short.length > 0`; otherwise the existing label + "clamped to what you hold" title.

## Scope (in)
- `packages/ui/src/game.ts`: `loadoutShort` helper
- `packages/ui/src/components/EmbarkPanel.tsx`: the ⚠ marker + dynamic tooltip on understocked loadout chips
- `packages/ui/test/app.test.tsx`: `loadoutShort` unit + a render test (seeded over-spec loadout → ⚠ shows)

## Scope (out)
- No auto-restock / "buy the shortfall" jump (that's the contract/gear pattern; loadouts are about what you HOLD) — just the warning
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] understocked loadout chip shows ⚠ + a tooltip ("understocked: shark 1/3 …"); render test confirms `.short` + ⚠
- [x] `loadoutShort` unit-pinned (short incl. have=0 sorted first, fully-stockable → [], exact → [], want=0 ignored)
- [x] UI suite (431, +2: unit + render) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — surfaces the existing `applyLoadout` clamp semantics; no behavior change to the clamp itself.
