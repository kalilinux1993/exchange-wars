# Phase: Exchange Wars — Phase 19e: expectedHit must apply the engine's PER-ROLL damage floor (combat forecast under-counts incoming damage) (Brick 291)

**Started:** 2026-06-13
**Hat:** Auditor → Builder (reference-verify seam — a UI helper mirroring engine math gets the floor wrong)
**Goal:** `expectedHit` (game.ts:548) estimates a hit as `max(1, (lo+hi)/2 − floor(def/4))` — it floors the
MEAN. But the engine floors EACH roll at 1 (quest.ts:415: `max(1, raw − floor(def/4))`). When some — but not
all — rolls in `[lo, hi]` would land ≤1, the engine lifts each of those up to 1, pulling the true mean ABOVE
`max(1, mean − k)`. Replace the mean-floor with the exact average of the per-roll clamp over the inclusive
uniform range, so the embark/dive forecast counts the damage the engine actually deals.
**Done condition met:** yes — `expectedHit` sums `max(1, raw − floor(def/4))` over `raw ∈ [lo, hi]` and
divides by the count; mixed-regime values now match the engine (fire-giant atk 19 vs def 60 → 19/13 ≈ 1.46,
green-dragon atk 24 vs def 60 → 53/17 ≈ 3.12, both previously reported as 1); exact-regime values unchanged;
`combatForecast` now shows a shorter rounds-to-fall for armoured targets; suite + e2e green; typecheck clean.

## Why this brick — a real, dangerous-direction bug
`floor(def/4) ≥ ceil(foe.atk/3)` holds for essentially ANY armoured player (def ≳ 1.3× foe atk), so `foeDpr`
in the forecast was systematically UNDER-counted → `roundsToFall` inflated → the forecast told the player they
were SAFER than the engine makes them. Concretely, a def-60 player reading a fire-giant (atk 19) saw 1.0
dmg/landed-hit when the engine deals ≈1.46 (46% low); vs a green dragon (atk 24), 1.0 vs ≈3.12 (3× low). This
is the same bug-class as 18o (forecast ignored hitChance), 18p (bidWalk gross-not-net tax), 18w (realized P&L
per-unit tax floored to 0 below price 50): a UI helper that mirrors engine math but applies an aggregate
operation where the engine applies a per-element one.

## Design — average the per-roll clamp exactly
- `expectedHit(atk, def)`: keep `lo = max(1, ceil(atk/3))`, `hi = max(2, atk)`, `k = floor(def/4)`. Replace
  `max(1, (lo+hi)/2 − k)` with `Σ_{raw=lo}^{hi} max(1, raw − k) / (hi − lo + 1)`. `rng.int` is inclusive
  (rng.ts:7), so this is the exact expectation. A bounded loop (≤ ~atk iterations) in a forecast helper — the
  obviously-correct form; closed-form risks an off-by-one I couldn't catch with same-reasoning tests.
- No change to `hitChance` or `combatForecast` structure — they already multiply accuracy correctly (18o); the
  fix flows through `expectedHit`.

## Scope (in)
- `packages/ui/src/game.ts`: rewrite `expectedHit` body + doc comment
- `packages/ui/test/app.test.tsx`: pin mixed-regime values (19/13, 53/17) + a no-regression pin (exact
  regimes unchanged) + a `combatForecast` assertion that an armoured target now sees fewer rounds-to-fall

## Scope (out)
- No engine change (the engine is ground truth — it's correct); no redeploy (UI-only); no closed-form rewrite
  (loop is clearer and bounded); no change to `combatForecast`/`hitChance`/`diveReadiness` structure

## Subsystems touched
- packages/ui/src/game.ts (expectedHit)
- packages/ui/test/app.test.tsx

## Gates
- [x] expectedHit averages the per-roll floor; mixed-regime pins match engine (19/13, 53/17); exact regimes unchanged
- [x] combatForecast: armoured target sees shorter rounds-to-fall than the buggy mean-floor implied — pinned
- [x] UI suite (~457, +3) + e2e (13) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — `rng.int` inclusivity verified (rng.ts:7/26); existing forecast tests are all exact-regime or
  self-consistent (diveReadiness reuses the helper), so none pin a value the fix changes.
