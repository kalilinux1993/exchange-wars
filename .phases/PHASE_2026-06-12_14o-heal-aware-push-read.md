# Phase: Exchange Wars — Phase 14o: Heal-Aware Push Read (Brick 171)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — combat decision-support)
**Goal:** Make the mid-dive "push or bank?" read account for the food you've PACKED —
show how many extra rounds your remaining heal buys, and drop the "bank?" nag when
that food would win the race.
**Done condition:** The push read shows a "🍖 food +≈N" cushion when consumables are
packed; the displayed favored/risky verdict stays at RAW hp; suite + e2e green. **MET.**

## Why this brick
The push read (13p) judged survival at current hp only — but a diver carrying 4 sharks
has 80 hp of cushion the read ignored, making a survivable push look as risky as a bare
one. Folding packed heal into the read completes the push-your-luck arc (13o extract-stake
→ 13p push read → 14o heal-aware). NEXT_STEPS flagged exactly this ("a heal-aware variant:
count packed food into rounds-to-fall").

## Design — cushion clause, honest verdict
- `healFromPack(pack)` (game.ts, pure): Σ `CONSUMABLES[id].heal × qty`. Deliberately
  OPTIMISTIC — raw sum, ignores overheal — matching `combatForecast`'s own
  expected-value, estimate-not-a-promise framing. Gear / zero-qty contribute 0.
- Push read: re-read `combatForecast` at `hp + packHeal` → `ff`. The DISPLAYED verdict
  still uses raw-hp `f` (food must not silently flip risky→favored — the raw danger is
  the honest headline). Add a green "🍖 food +≈{ff.roundsToFall − f.roundsToFall}" clause
  when food is packed, and suppress the "bank your haul?" nag only when `ff.favored`
  (your food would win the race).

## Why the verdict stays raw (the design call)
Basing favored/risky on with-food hp would make a well-stocked diver see "favored"
everywhere and hide the streak risk (the next foe is random; food is finite across many
foes). Showing raw danger + an explicit cushion is more transparent decision support than
one munged verdict: the player sees the threat AND their margin, and decides.

## Outcome
- `game.ts`: `healFromPack` helper + `CONSUMABLES` added to the engine import.
- `ExpeditionPanel.tsx`: push-read IIFE folds `packHeal` into a second forecast `ff`;
  cushion clause + nag suppression.
- Tests (+2): `healFromPack` unit (sums heal×qty, ignores gear/zero-qty); a wounded
  dive WITH food shows the "🍖 food +≈" clause. Existing no-food wounded read stays green
  (packHeal 0 → no clause, nag unchanged).

## Gates
- [x] `healFromPack` pure unit test
- [x] cushion-clause render test; existing push-read test still green
- [x] UI suite (294, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Follow-ups
- Still open from 13p: show the TYPICAL foe alongside the hardest in the push read.
- A more exact cushion would model overheal (cap each eat at max hp over the fight) — deferred;
  the optimistic estimate is honest under the existing "estimate, not a promise" frame.
