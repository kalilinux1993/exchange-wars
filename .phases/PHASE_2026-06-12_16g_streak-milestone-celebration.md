# Phase: Exchange Wars — Phase 16g: Survival-Streak Milestone Celebration (Brick 215)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — retention celebration)
**Goal:** Fire a "🔥 {N}-dive survival streak!" toast when a clean extraction reaches a milestone (5/10/25/
50/100) — the active reward half of 16f's passive streak readout, marking the genuine achievement of a long
clean run the way the game already celebrates deeds, best hauls, daily streaks, and level-ups.
**Done condition:** A survived dive that pushes the survival streak onto a milestone value fires a one-shot
celebration toast; non-milestone dives and deaths don't; suite + e2e green.

## Why this brick
16f added the streak READOUT (current + best in the Delve Log) but no moment when you hit a meaningful run.
A milestone celebration is the active complement (readout ↔ celebration, the pattern used for best-haul 15e,
daily streak 15m, level-up 13v). It's deliberately MILESTONE-gated, not every-new-best: the streak grows by
exactly 1 per survived dive, so celebrating every increment past your old best would toast every dive on a
good run (noisy); sparse milestones (5/10/25/50/100) fire at most once per milestone-reaching dive — a real
"you've done something hard" moment, not spam. Completes the streak feature; reuses the 15e onDelveEnd
append-point detection (no ref, no swap-guard — `onDelveEnd` only fires on a real dive-end).

## Design — a pure milestone predicate + one onDelveEnd toast
- `game.ts`: `STREAK_MILESTONES = [5,10,25,50,100]` + `isStreakMilestone(current)` = exact membership.
  Because the streak increments by 1 per survived dive, exact-equality fires each milestone once as it's
  reached (a death → streak 0 → never a milestone, so no fire on a death). Pure.
- `App.tsx` `onDelveEnd`: AFTER appending the record (so `diveStreak(game.delves).current` is the new
  streak), if `isStreakMilestone(current)`, `setToast` "🔥 {N}-dive survival streak!". Placed after the
  best-haul toast (the rarer milestone wins the slot on the rare both-at-once dive).

## Scope (in)
- `game.ts`: `STREAK_MILESTONES` + `isStreakMilestone`
- `App.tsx`: the milestone toast in `onDelveEnd`
- `app.test.tsx`: `isStreakMilestone` unit (fires on the milestone set, not between, not at 0)

## Scope (out)
- No celebration on every new best (noisy — milestone-gated by design); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `isStreakMilestone` true exactly on {5,10,25,50,100}, false between (4/6/11) and at 0
- [x] the toast fires from `onDelveEnd` on a milestone-reaching survived dive; a death (streak 0) can't reach a milestone
- [x] UI suite (363, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `diveStreak` (16f) + the 15e detection site.
