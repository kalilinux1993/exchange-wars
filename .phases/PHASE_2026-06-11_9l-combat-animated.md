# Phase: Exchange Wars — Phase 9l: Combat, Animated (Brick 38)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (OSRS HUD arc — the queued combat juice)
**Goal:** An OSRS-style combat scene replacing the flat foe hp-bar: your adventurer vs a deterministically-generated monster, hp bars over each, hit-splats floating up once per round. Pure SVG/CSS over existing combat state; no engine change.
**Done condition:** scene renders the foe + animates a splat per round; combat still playable; suite + e2e green; screenshot refreshed. **MET.**

## Outcome
- CombatScene.tsx: render-diff splats (ref-gated on log length, keyed remount = one float-and-fade per round, FINDINGS #36/#72); monster generated from id (hue + dragonfire horns / leech tendrils / elite crown+scale); player figure with lit body/weapon when geared; bobbing idle.
- Wired into the combat branch (replaces the foe hp-bar block; player hp now shown in-scene + a text line).
- styles.css: combatscene, scenehp, splat keyframes, monster-bob.
- 186/186 unit (new combat-scene test); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #72.

## Gates
- [x] Splat animates per round (keyed remount; render test)
- [x] Combat still playable (e2e fight path green)
- [x] Suite + e2e green
