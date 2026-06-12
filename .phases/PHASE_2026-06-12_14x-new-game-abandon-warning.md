# Phase: Exchange Wars — Phase 14x: New-Game Abandon Warning (Brick 180)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — robustness / player-protection)
**Goal:** Before the manual "new game" seed-form "start" wipes the save, tell the player
concretely what they're abandoning — but only when there's actually progress to lose.
**Done condition:** The seed form shows "⚠ wipes this run — {worth} net · {N} deeds" when
the current run has earned deeds or grown its worth; a fresh run shows nothing; suite + e2e green.

## Why this brick
`restart()` calls `clearSave()` — the current run (worth, deeds, gear) is irrecoverably wiped
(only a racing "ghost" survives). The challenge-link path already WARNS ("Starting abandons
your current…"), but the manual new-game → seed-form → start path warns nothing. That's the
same consistency gap as 14w (one surface protects, its sibling doesn't), and a real footgun.
Fresh subsystem (robustness) untouched this session.

## Design — pure stakes helper + a gated, concrete warning
- `restartStakes(game, worth)` (game.ts, pure) → `{ worth, deeds, atStake }` where
  `deeds = game.milestones?.length`, `atStake = deeds > 0 || worth > startGp` (you've earned a
  deed or grown beyond your stake — something real to lose).
- App seed form: when `atStake`, render a "⚠ wipes this run — {fmtCompact(worth)} net · {N}
  deeds" note (the count quantifies the loss; the title explains the run survives only as a
  ghost). A fresh run (no deeds, worth == startGp) shows nothing — warn only when warranted, no
  alarm-crying-wolf.

## Why concrete + gated (the honesty call)
A generic "are you sure?" is noise; quantifying the loss ("250K net · 7 deeds") lets the
player weigh it. And gating on real progress means the warning MEANS something when it appears
— it's not a reflexive confirm on every restart, so it doesn't train the player to ignore it.

## Scope (in)
- `game.ts`: `restartStakes` helper
- `App.tsx`: the gated warning in the seed form
- `app.test.tsx`: helper unit (atStake on deeds / worth-growth / neither) + an App render assertion

## Scope (out)
- No extra confirmation tap (the flow is already new-game → seed-form → start; the warning is the
  guard, not a third gate); no change to the challenge path's existing warning; no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `restartStakes`: atStake true on deeds>0 OR worth>startGp; false for a fresh/underwater run
- [x] seed form shows "⚠ wipes this run … · 2 deeds" when at stake; hidden for a fresh run (App render test)
- [x] UI suite (315, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Threshold is "any gain or any deed"; could raise to a more meaningful bar if it nags on tiny
  market drift — deferred (a fresh game's worth == startGp exactly, so drift only appears after play).
