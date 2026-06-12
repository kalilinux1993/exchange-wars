# Phase: Exchange Wars — Phase 16b: Live Provisional Board Standing (Brick 210)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — live competitive feedback)
**Goal:** During the sprint window, show where your CURRENT fortune would place you on the board right now —
"if the sprint ended now (tick X/2000), you'd sit #N" — a live race position, the dynamic complement to
16a's static gap to your already-submitted rank.
**Done condition:** Before the sprint mark, the board shows a provisional-rank line from your current worth
vs the fetched rows; hidden after the mark (where current worth ≠ your sprint score); suite + e2e green.

## Why this brick
16a gave the gap to the rank above your SUBMITTED score — useful, but static. The board scores are worth at
`SPRINT_TICKS`, and BEFORE you reach that mark your current worth IS what your sprint score would be if it
ended now — so "you'd sit #N" is a genuinely honest LIVE ladder position during the race, the exact moment
competitive feedback matters most. After the mark, current worth includes post-sprint play and is no longer
your sprint score, so the line hides itself (16a's submitted-rank gap covers that phase). Makes the board
feel alive during the sprint instead of being a thing you only consult after submitting.

## Design — a pure helper + a sprint-window-gated line
- `LeaderboardPanel.tsx`: `provisionalRank(rows, myWorth)` = `1 + rows.filter(r => r.worth >= myWorth).length`
  (the board is desc-sorted; `>=` so a tie sits BELOW the incumbent — you haven't BEATEN an equal score, and a
  fresh submission lands after existing equal ones). Pure.
- Render, gated to `game.world.tick < SPRINT_TICKS`: "if the sprint ended now (tick {tick}/{SPRINT_TICKS}),
  your {worth} gp would sit #{rank}" using `playerWorth(game)`.

## Scope (in)
- `LeaderboardPanel.tsx`: `provisionalRank` + the sprint-window provisional line (`playerWorth` import)
- `app.test.tsx`: `provisionalRank` unit (insertion position; strict-`>` tie handling; top/bottom)

## Scope (out)
- No line after the sprint mark (current worth isn't a sprint score then — honesty gate); no change to 16a's
  submitted-rank gap; no engine change

## Subsystems touched
- packages/ui/src/components/LeaderboardPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `provisionalRank` returns the 1-based slot your worth would take (`>=`: a tie sits below the incumbent → #3 in the test)
- [x] the board shows the provisional line only before the sprint mark (gated on `tick < SPRINT_TICKS`)
- [x] UI suite (359, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the fetched rows + `playerWorth`; the sprint-window gate keeps it honest.
