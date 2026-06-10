# Phase: Exchange Wars — Phase 6k: Tier-3 Money Printer Fix

**Started:** 2026-06-10
**Hat:** Builder (economy integrity)
**Goal:** Close FINDINGS #33 — idle automation must not farm high-priced exotics for +140k–195k/8k ticks. Exotics become human-only territory; the balance gate learns to see magnitude.
**Done condition:** tier 3 swept + locked under a bounded vol ceiling (both scenarios green); configureBot risk clamp + UI options bounded the same way; balance gate gains a magnitude ceiling; all gates green; CI + live.

## Scope (in)
- TUNING.automation.autoFlip[2] vol ceiling 1 → below exotic vol 0.13; sweep cadence×vol BOTH legs
- configureBot maxVolatility clamp (commands.ts) + UpgradeShop risk options: max configurable risk ≤ the new automation ceiling
- Balance gate: every tier median < N× tier-1 median (magnitude ceiling)
- Tests for the clamp; fixture updates if any

## Scope (out — explicit non-goals)
- Corridor compression in the generator (changes human play — exotic swings are the fun)
- New items / UI features (next iterations)

## Subsystems touched
- packages/engine/src/agents.ts (TUNING), packages/engine/src/commands.ts
- packages/engine/test/balance.test.ts, commands.test.ts
- packages/ui/src/components/UpgradeShop.tsx

## Gates
- [x] Two-leg sweep for tier 3 (cad 4 dominant: min +2,094, medians +4,801/+4,257); balance gate green incl. new 20× magnitude ceiling
- [x] typecheck + 106 unit + 6 e2e green
- [ ] CI green + live bundle verified (checked post-push)

## Outcome notes
- Scope shrank: no commands.ts/UpgradeShop edits needed — clerk config already min()s against the tier ceiling, so "tier max" risk is bounded automatically (FINDINGS #35).
