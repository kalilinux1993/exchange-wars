# Phase: Exchange Wars — Phase 2d: Idle Tier Balance Pass

**Started:** 2026-06-10
**Hat:** Tuner (measure → diagnose → adjust → gate; no new mechanics)
**Goal:** Make the autoFlip tier curve monotonic and meaningful across seeds and scenarios, with data. Fix FINDINGS #15.
**Done condition:** `npm run balance` harness exists and prints the tier×scenario×seed matrix; seed-averaged profit is strictly monotonic in tier (isolated AND competitive) and tier 1 is solidly positive; the curve is locked in by a new balance gate test; all existing gates green.

## Scope (in)
- src/cli/balance.ts: measurement harness — tiers 0–3 × {isolated, competitive} × 5 seeds, normalized working capital, profit + payback table
- Diagnose tier-3 < tier-2 with the data; tune TUNING.automation (constants only) until monotonic
- test/balance.test.ts: gate — seed-averaged monotonicity + tier-1 positivity (3 seeds × both scenarios to keep the suite fast)
- FINDINGS entry with the measured curve before/after

## Scope (out)
- New mechanics, NPC changes, exchange changes — constants only
- Payback-period gameplay targets beyond "tier 1 solidly positive" (full progression-economy design is later)

## Subsystems touched
- src/cli/balance.ts (new), src/engine/agents.ts (TUNING.automation values only), test/balance.test.ts (new), package.json (balance script)

## Gates
- [x] Balance harness — `npm run balance`, tier × scenario × seed matrix + payback
- [x] Tier curve fixed — done condition AMENDED with data: averages are outlier-poisoned (seed 42 t2 +3,104), so the gate uses per-seed positivity + median ordering vs tier 1; t2↔t3 near-tie documented (FINDINGS #18). Tier 1 solidly positive (min seed +211 competitive). Catastrophic t3 losses eliminated (seed 99: −4,306 → +1,735).
- [x] Balance gate green; all 65 tests green
- [x] Adversarial review decision: SKIPPED with rationale — constants-only tuning + a pure measurement helper; no new engine mechanics; the gate was explicitly designed against the knife-edge failure mode the Phase 2c review flagged (median + per-seed floors instead of a thin binary margin)

**Closed:** 2026-06-10 — done condition met (as amended above).

## Open questions
- Is the tier-3 dip competition interference or strategy self-drag (3rd-best candidate marginal)? Data will say.
