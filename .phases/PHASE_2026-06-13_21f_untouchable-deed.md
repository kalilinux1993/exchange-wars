# Phase: Exchange Wars — Phase 21f: "Untouchable" deed — a clean-dive-survival-streak badge (Brick 324)

**Started:** 2026-06-13
**Hat:** Builder (progression — a new deed; pivot off the trading-heavy 21a/d/e bricks)
**Goal:** The deed roster rewards reckless diving ("Nine Lives" — 9 deaths) but has NO positive counterpart
for careful diving — despite the game heavily instrumenting the push/bank decision (push-read 13p, death
stakes 18e) and already tracking a dive-survival streak (16f/16g). Add an "Untouchable" deed for a 10-dive
clean-extraction streak.
**Done condition met:** yes — a new MILESTONES entry `untouchable` whose `achieved` is `diveStreak(g.delves)
.best >= 10` (with `best/10` progress), reusing the existing streak helper so the deed agrees with the Delve
Log readout + streak toasts; unit test (achieved at 10, partial at 9-then-death, latches via checkMilestones);
suite + e2e green; typecheck clean.

## Design
- Deeds are UI-side (`MILESTONES`/`checkMilestones` in game.ts, persisted in `game.milestones`) and are NOT
  part of the leaderboard replay (replayRun recomputes worth from the command log; it never runs
  checkMilestones), so a new deed is UI-only — no engine change, no verify-score redeploy, no save migration
  (an unearned id simply isn't in old saves' arrays until earned).
- `achieved: (g) => diveStreak(g.delves).best >= 10` — reuses the 16f helper (same definition of "clean run"
  the streak readout + toasts use), reads `game.delves` (UI-side). Placed beside `nine-lives` (its thematic
  opposite — deaths vs deathless run).

## Scope (in)
- packages/ui/src/game.ts (one MILESTONES entry)
- packages/ui/test/app.test.tsx (deed unit test, modeled on the apex-predator deed test)

## Scope (out — explicit non-goals)
- No engine change (deeds are UI-side) → no redeploy; no new helper (reuses `diveStreak`)
- Not retuning the streak toast milestones (5/10/25/50/100) — the deed simply keys on the 10 rung

## Subsystems touched
- packages/ui/src/game.ts (MILESTONES)
- packages/ui/test/app.test.tsx

## Gates
- [x] untouchable: achieved at best ≥ 10; not at a 9-then-death streak; progress = best/10; latches via checkMilestones
- [x] typecheck clean; UI suite 507 (+1); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- A higher rung (25/50?) could be a capstone later; 10 matches a STREAK_MILESTONES toast rung — defer.
