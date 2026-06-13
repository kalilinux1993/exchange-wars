# Phase: Exchange Wars — Phase 17p: Review (17i–17o) + reset goalHit on clear (Brick 250)

**Started:** 2026-06-12
**Hat:** Maintainer (Draft-Review-Merge — the Review step on 17i–17o)
**Goal:** Run the adversarial review on the unreviewed bricks (17i–17o, b0cf039..1e1cb1f) and fix the real
finding. Verdict SOUND; the one actionable (MEDIUM): clearing a worth goal zeroes `ew-worth-goal` but leaves
`ew-goal-hit` orphaned in localStorage — `setGoal(0)` must also `setGoalHit(0)` so a re-set goal celebrates
correctly and no stale persisted state lingers. Plus document the `paceMetric: 'worth'` ETA contract (LOW).
**Done condition:** clearing the goal resets `goalHit` (a re-set same-value goal can re-celebrate); the
`paceMetric` contract is documented; suite + e2e green.

## Why this brick
6 bricks shipped since the 17i review. The adversarial-reviewer traced the goal toast (fire-once + reload),
the ETA math (div-by-zero guards), the `/`-filter + `mom` column (active-gating, null-sink, column-count
alignment), and the EmbarkPanel hoist → **SOUND**. One MEDIUM: the goal ✕ clears `goal` but not `goalHit`, so
the hit-marker persists for a goal that no longer exists. Today it's harmless (the effect guards on
`goal > 0`), but it's dead state AND it means clearing then re-setting the SAME target value would NOT
re-fire the celebration (goalHit still equals it). Reset it on clear: correct re-celebration + no orphan.

## Design — reset goalHit on clear + document the contract
- `WealthPanel.tsx`: the clear button → `{ setGoal(0); setGoalHit(0); }` (a small handler instead of the
  inline `setGoal(0)`).
- `game.ts`: a contract comment on `paceMetric: 'worth'` — the deed's `progress` MUST be `worth/threshold`
  for `deedEta`'s threshold-from-progress recovery to be valid (it is for all 5 worth deeds).

## Scope (in)
- `WealthPanel.tsx`: reset `goalHit` on clear
- `game.ts`: `paceMetric` contract comment
- `app.test.tsx`: clearing resets goalHit → a re-set same-value goal re-celebrates

## Scope (out)
- The cosmetic LOW (`/` while a chip/filter is focused is swallowed) — the typing-guard intentionally exempts
  inputs/buttons; the common (body-focused) case works. Noted, not changed.
- No engine change — no redeploy

## Subsystems touched
- packages/ui/src/components/WealthPanel.tsx
- packages/ui/src/game.ts
- packages/ui/test/app.test.tsx

## Gates
- [x] clearing the goal resets `goalHit` (asserted via the persisted `ew-goal-hit` → 0; no orphan)
- [x] `paceMetric: 'worth'` contract documented on the Milestone field
- [x] UI suite (414, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)
- [x] Adversarial review of 17i–17o: **SOUND** (goal toast fire-once/reload, ETA math guards, /-filter + mom column, hoist all verified); the MEDIUM closed, the LOW contract documented, the cosmetic LOW noted

## Open questions
- None — review SOUND; the single MEDIUM closed, the contract LOW documented, the cosmetic LOW noted.
