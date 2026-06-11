# Phase: Exchange Wars — Phase 10f: The Fighter Wears Your Kit (Brick 58)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (cohesion polish — the combat figure should reflect actual gear)
**Goal:** Replace CombatScene's single `geared` boolean with a per-slot FighterKit so the fighter figure lights helm/body/legs/weapon/shield independently, mirroring the paperdoll. No engine change.
**Done condition:** scene takes a kit, figure lights per slot; suite + e2e green. **MET.**

## Outcome
- CombatScene: FighterKit (5 slot booleans) prop replaces geared; figure adds helm + shield plates, all lit per kit.
- ExpeditionPanel computes fighterKit from exp.pack + usable levels (inert gear skipped), passes it.
- 200/200 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #92.

## Gates
- [x] Figure reflects equipped slots (typecheck + existing combat-scene test green)
- [x] Suite + e2e green
