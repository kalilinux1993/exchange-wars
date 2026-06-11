# Phase: Exchange Wars — Phase 10p: Bestiary Portraits (Brick 68)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (cohesion + visual — the bestiary's monsters were text-only)
**Goal:** Extract the combat monster silhouette into a shared MonsterBody/MonsterGlyph and give met bestiary entries a portrait. DRY, no engine change.
**Done condition:** shared component, combat scene refactored to use it, bestiary portraits, tests; suite + e2e green. **MET.**

## Outcome
- MonsterBody.tsx: hueOf + the archetype shapes (ooze/drake/brute/critter + elite crown); MonsterGlyph standalone-svg wrapper. CombatScene embeds <MonsterBody> (inline switch removed); ExpeditionPanel bestiary uses <MonsterGlyph size=22> per met entry.
- 205/205 unit (bestiary row shows .monsterglyph; combat-scene position test stayed green through the refactor); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #102.

## Gates
- [x] Met bestiary entries show a portrait (test); combat scene unchanged (position test green)
- [x] Suite + e2e green
