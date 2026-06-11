# Phase: Exchange Wars — Phase 9s: Combat Scene, Grounded (Brick 45)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (polish — the scene looked sparse/unfinished beyond the 9r bug)
**Goal:** Make the combat scene read as finished: arena floor + drop-shadows, larger grounded figures, a fuller adventurer silhouette, wider rounded hp bars, viewBox fit. Pure layout, no mechanics.
**Done condition:** scene polished; regression test (monster positioning transform) still green; suite + e2e green. **MET.**

## Outcome
- CombatScene: ground line + shadows; figures ~40% larger, feet on baseline; adventurer = head/torso/2 legs/weapon (gear-tinted); monster ellipse rx20 ry23; hp bars 76w rounded; viewBox 96→104; splat anchors repositioned.
- styles.css: .ground / .shadow.
- Regression test updated to translate(150 (monster moved x 160→150) — still asserts the positioning transform survives the bob.
- 191/191 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #79.

## Gates
- [x] Monster positioning transform intact (regression test)
- [x] Suite + e2e green
