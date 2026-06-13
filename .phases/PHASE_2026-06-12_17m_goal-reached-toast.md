# Phase: Exchange Wars — Phase 17m: Celebrate reaching your worth goal (Brick 247)

**Started:** 2026-06-12
**Hat:** Builder (retention — pay off the goal you set)
**Goal:** Fire a one-shot "🎯 Goal reached!" toast the moment your worth crosses the target set in 17l — the
proactive payoff (fires even from another tab) that makes hitting a self-set goal a MOMENT, not just a
passive "✓ reached" you might not be looking at.
**Done condition:** Crossing the goal fires the toast once; a reload (still over the goal) doesn't re-fire;
setting a goal you've ALREADY passed doesn't fire; suite + e2e green.

## Why this brick
17l lets you set a target with progress + ETA, but reaching it only flips a passive "✓ reached" in the
WealthPanel — invisible if you're trading/diving on another tab. A toast closes the loop (set → track →
CELEBRATE). The clobber risk that ruled out the readiness nudge (17h) doesn't apply here: a CUSTOM worth
number rarely coincides with a deed/level tick, so the goal toast won't routinely steal another
celebration's slot.

## Design — a WealthPanel effect, guarded by a persisted `goalHit`
- `WealthPanel.tsx`: optional `onToast?(name, flavor)` prop. A `usePref<number>('ew-goal-hit', 0)` stores the
  goal value already celebrated. A `useEffect` keyed on `[gv?.reached, goal, goalHit]`: when `gv.reached &&
  goalHit !== goal`, fire `onToast('🎯 Goal reached!', '{goal} gp — set your next target')` and
  `setGoalHit(goal)`. Reaches once per goal; survives reload (goalHit persists). `commitGoal` sets
  `goalHit = worth >= n ? n : 0`, so setting an ALREADY-met goal records it as hit (no fire) while a fresh
  unmet goal stays fireable. WealthPanel re-renders every tick (App `force()`), so the crossing is caught
  live AND on the first post-offline render.
- `App.tsx`: pass `onToast={(name, flavor) => setToast({ id: 'goal', name, flavor, achieved: () => false })}`.

## Scope (in)
- `WealthPanel.tsx`: `onToast` prop + `goalHit` pref + the cross-detection effect + `commitGoal` pre-met guard
- `App.tsx`: pass `onToast` to WealthPanel
- `app.test.tsx`: crossing fires once; further re-renders don't; (the existing WealthPanel tests, which omit onToast, still pass)

## Scope (out)
- No auto-clear of the goal (the passive "✓ reached" + manual ✕ stay; you choose when to set the next)
- No engine change — no redeploy

## Subsystems touched
- packages/ui/src/components/WealthPanel.tsx
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] crossing the goal fires `onToast` once; a higher re-render doesn't re-fire (goalHit guard); pre-met set doesn't fire
- [x] existing WealthPanel tests (no onToast) unaffected — 411 pass
- [x] UI suite (411, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — the persisted `goalHit` guard is the same "fire-once, survive reload" discipline as the duel's delete+save (16v).
