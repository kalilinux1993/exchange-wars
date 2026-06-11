# Phase: Exchange Wars — Phase 9y: Monster Silhouettes (Brick 51)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (HUD polish — kill the "every monster is the same blob" tell)
**Goal:** Distinct combat-scene silhouettes by archetype, chosen deterministically from existing fields (leech/dragonfire/hp): ooze, winged drake, brute, critter. Pure SVG, no engine/data change.
**Done condition:** four forms render; existing combat-scene test still green; suite + e2e green. **MET.**

## Outcome
- CombatScene monster inner-group = an archetype switch (ooze=blob+drip+tendrils, drake=wings+snout+horn+tail, brute=torso+head+arms, critter=small+feet), per-form eyes, shared hue/elite-crown.
- No new data (reuses m.leech/m.dragonfire/m.hp); no per-shape unit assertions (avoids SVG-internals brittleness — existing position/splat test still guards the load-bearing behavior).
- 195/195 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #85.

## Gates
- [x] Forms render, positioning/splat test still green
- [x] Suite + e2e green
