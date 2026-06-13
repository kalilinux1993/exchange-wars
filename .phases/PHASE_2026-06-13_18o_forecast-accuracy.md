# Phase: Exchange Wars — Phase 18o: combatForecast models accuracy (fold in the engine's hitChance) (Brick 275)

**Started:** 2026-06-13
**Hat:** Reviewer → Builder (Kronos rule: reference-verify a decision aid against the engine, fix the desync)
**Goal:** Reference-verified `expectedHit` against the engine damage formula (quest.ts:414-415) — IN SYNC, the
NEXT_STEPS desync risk is not present. But found a real one: the engine gates every hit on `hitChance`
(quest.ts:410, 0.15–0.95 by atk−def), yet `combatForecast` uses `expectedHit` as damage-PER-ROUND with NO
accuracy factor — so it ignores misses and can read "favored" for a fight you'd lose by missing. Fix:
expected damage per ROUND = `hitChance × expectedHit` both ways (dragonfire bonus stays per-landed-hit →
inside the foe's multiply, matching quest.ts:475-481).
**Done condition:** combatForecast multiplies each side's per-hit damage by the engine's `hitChance`; a foe
that rarely lands (high your-def) correctly reads many more roundsToFall; `hitChance` mirrors quest.ts:410
exactly and is unit-pinned; all existing forecast tests still pass; suite + e2e green.

## Why this brick
A reference-verify of `expectedHit` (NEXT_STEPS flagged it as a "keep in sync with quest.ts" desync risk)
confirmed the damage ROLL formula is in sync — but surfaced that the FORECAST omits the engine's accuracy
roll entirely. The engine resolves each swing as `if (rng.chance(hitChance(atk,def))) damage(...)`, so
expected per-round damage is `hitChance · E[damage|hit]`; `combatForecast` divided hp by `E[damage|hit]`
alone, treating every swing as a hit. Effect: it systematically UNDER-states rounds (overstates speed) and —
because hit rates are asymmetric (your atk vs foe def ≠ foe atk vs your def) — biases every favored/risky
verdict toward the middle. A "favored" verdict on a fight you'd actually lose (because you miss half your
swings vs a high-def foe) is a decision aid that gets players killed. Same class as the 18g `deathRecap`
desync: the predictor must match the arbiter. This is UI-only (combatForecast is a pure prediction; the
engine is untouched, so determinism/sim are unaffected), but it has real blast radius — `diveReadiness`
(safe-depth advice + RegionMap "dive here" ring) reads `combatForecast.favored`, so the safe-depth advice
will SHARPEN (regions where you miss a lot correctly become "risky"). That shift is the fix working.

## Design — per-round = hitChance × per-hit
- `game.ts`: add `hitChance(atk, def)` = `Math.min(0.95, Math.max(0.15, 0.55 + (atk − def) * 0.02))` — mirrors
  quest.ts:410 EXACTLY (keep-in-sync comment + a unit test). `combatForecast`:
  `yourDpr = hitChance(you.atk, foe.def) * expectedHit(you.atk, foe.def)`;
  `foeDpr = hitChance(foe.atk, you.def) * (expectedHit(foe.atk, you.def) + foeHitBonus)` (dragonfire is
  per-landed-hit, so inside the multiply); `roundsToKill = ceil(foe.hp / yourDpr)`, `roundsToFall =
  ceil(you.hp / foeDpr)`. `favored` unchanged (`roundsToKill <= roundsToFall`). Min dpr = 0.15·1 > 0 → still
  never divides by zero.
- Doc: `expectedHit` stays "expected damage per LANDED hit"; `combatForecast` now "models accuracy".

## Scope (in)
- `packages/ui/src/game.ts`: `hitChance` helper + `combatForecast` folds it in
- `packages/ui/test/app.test.tsx`: `hitChance` unit (formula + clamps) + a combatForecast test proving accuracy is modeled (a rarely-hitting foe → many more roundsToFall)

## Scope (out)
- expectedHit UNCHANGED (it's in sync — per-landed-hit mean); no engine change (the engine already does this); no redeploy
- No balance change — the engine is untouched; only the PREDICTION gets accurate

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/test/app.test.tsx

## Gates
- [x] `combatForecast` per-round dmg = `hitChance × expectedHit` both ways; dragonfire foeHitBonus inside the foe multiply
- [x] `hitChance` mirrors quest.ts:410 — unit-pinned (0.75 mid, 0.55 even, 0.95 cap, 0.15 floor)
- [x] ALL existing forecast/diveReadiness tests still pass (446 total, +2 new); a rarely-landing foe now reads >3× the per-hit-only roundsToFall
- [x] UI suite (446) + e2e (11, expedition/combat e2e green) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — verified against quest.ts:410/414-415; the engine is the ground truth and is unchanged.
