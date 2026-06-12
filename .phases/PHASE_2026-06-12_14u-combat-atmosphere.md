# Phase: Exchange Wars — Phase 14u: Region-Themed Combat Atmosphere (Brick 177)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — art / atmosphere)
**Goal:** Give the combat scene a per-region backdrop so each fight has a sense of place
and the journey's escalation (verdant plains → fiery Maw → void Abyss) is FELT, not just
labeled.
**Done condition:** CombatScene renders a region-themed gradient backdrop (8 designed
palettes, fallback for unknown ids); suite + e2e green.

## Why this brick
Deliberate variety: this session has been ~8 functional/data bricks and zero pure
atmosphere work, and the frontend-design guidance favors backgrounds/atmosphere/depth over
flat fills. Every fight currently renders on the same transparent stage regardless of where
you are — the eight regions are distinct in DANGER but identical in FEEL. A themed backdrop
makes the descent from the soft plains to the light-eating Abyss visible at the moment it
matters most (mid-fight).

## Design — exported theme map + gradient backdrop, kept readable
- `arenaTheme(regionId)` (exported from CombatScene, pure): an id-keyed map → `{ from, to }`
  gradient stops, one designed palette per region in journey order — mossy green (Lumbridge)
  → murky sewer → stony dungeon → cavern → ominous dusk (Wilderness Ruins) → ember (Dragon's
  Maw) → fiery (Inferno Gate) → void purple (the Abyss). Unknown id → a neutral stone default.
- CombatScene: a `<defs><linearGradient>` + a background `<rect>` behind everything. Palettes
  are MUTED and dark-leaning so the hp bars, figures, and hit-splats stay legible on top — the
  backdrop sets mood without fighting the readout.
- `regionId` is a new OPTIONAL prop (fallback theme when absent), so existing render sites/tests
  are unaffected; ExpeditionPanel passes `exp.regionId`.

## Scope (in)
- `CombatScene.tsx`: `arenaTheme` + the gradient/backdrop + optional `regionId` prop
- `ExpeditionPanel.tsx`: pass `regionId={exp.regionId}` to CombatScene
- `app.test.tsx`: `arenaTheme` unit (known regions differ, unknown → default) + a render assertion

## Scope (out)
- No engine change; no per-region particles/weather (gradient only — atmosphere, not a render engine)
- No change to figures, hp bars, splats, or combat logic

## Subsystems touched
- packages/ui/src/components/CombatScene.tsx
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `arenaTheme` returns distinct palettes per region; unknown/absent id → the default
- [x] CombatScene renders the themed backdrop (`rect.arena-bg` filled `url(#arena-sky)`, abyss stop colour)
- [x] UI suite (307, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Palettes are a first design pass; trivially tunable. Kept muted to protect readability.
