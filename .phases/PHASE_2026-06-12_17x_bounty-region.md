# Phase: Exchange Wars — Phase 17x: Tell bounties WHERE to hunt the target (Brick 258)

**Started:** 2026-06-12
**Hat:** Builder (adventure — make a bounty actionable)
**Goal:** Each bounty names a target monster but not where it lives; show "· {region}" (the shallowest region
it appears in) on the bounty so the player knows where to go to claim it.
**Done condition:** A bounty for a monster shows the region(s) it appears in (shallowest first); a target
absent from every pool shows none; suite + e2e green.

## Why this brick
The Bounty Board pays for kills of a specific monster, but to ACT on a bounty you must know which region
spawns it — and the board never said. A hunter with a "Lava dragon ×3" order had to guess (or cross-check
the Bestiary) that lava dragons live in the Inferno Gate. A "· {region}" suffix on the target makes the
bounty self-actionable. Reuses the region→monster data (REGIONS pools + elite), inverted.

## Design — a pure `monsterRegions` + a dim region suffix on the bounty
- `game.ts`: `monsterRegions(monsterId)` → region NAMES where the monster appears (`r.monsters.includes(id)
  || r.elite === id`), shallowest first (REGIONS order). Pure.
- `BountyBoard.tsx`: after "{name} × {qty}", a dim "· {shallowest}{+N}" suffix (title lists the rest);
  omitted when the target appears nowhere.

## Scope (in)
- `game.ts`: `monsterRegions` helper
- `BountyBoard.tsx`: the region suffix
- `app.test.tsx`: `monsterRegions` unit (pool + elite, shallowest-first, empty) + a bounty render showing the region

## Scope (out)
- No click-to-jump (the embark RegionMap/DelvePanel already jump); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/BountyBoard.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `monsterRegions` lists pool + elite regions shallowest-first; empty for a no-region monster
- [x] a bounty shows its target's region (e.g. lava_dragon → The Inferno Gate); UI suite (423, +2) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — pure inversion of the region rosters; display only.
