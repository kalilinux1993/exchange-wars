# Phase: Exchange Wars — Phase 17t: Your worth goal as a target line on the Fortune chart (Brick 254)

**Started:** 2026-06-12
**Hat:** Builder (retention — visualize the climb toward your goal)
**Goal:** Draw the player's worth goal (17l) as a dashed target line on the Fortune chart, extending the
y-range so your worth line climbs toward it — the visual companion to the WealthPanel's progress%/ETA.
**Done condition:** With a chartable goal set, the chart shows a `.goalline` at the goal's worth + a note;
no goal / a too-far goal shows none; suite + e2e green.

## Why this brick
17l/m gave the goal a number, progress, ETA, and a celebration — all in the WealthPanel. The Fortune chart
already plots worth-over-time with the start baseline + ghost; adding the GOAL as a line you're climbing
toward makes the target spatial (you SEE the gap close). Read the persisted goal directly (live each render)
rather than lifting state out of the just-reviewed WealthPanel — lower risk, no churn on certified 17l/m/p.

## Design — read the goal live, extend the range (capped), draw a line
- `WorthChart.tsx`: `readGoal()` — `JSON.parse(localStorage['ew-worth-goal'])` guarded to a positive number,
  read each render (the chart re-renders every tick, so it tracks WealthPanel changes within a tick; a tiny
  paused-latency is acceptable for a chart). `showGoal = goal > 0 && goal <= dataMax * 3` (a too-far goal
  would flatten the worth line, so it's left to the WealthPanel readout). When shown, fold the goal into
  `max` so it's in view; draw a dashed `.goalline` at `y(goal)` with a 🎯 `<title>`, and a "· 🎯 {goal}"
  note in the text line.
- `styles.css`: `.goalline` (a distinct dashed target line).

## Scope (in)
- `WorthChart.tsx`: `readGoal` + range fold + the line + the text note
- `styles.css`: `.goalline`
- `app.test.tsx`: a chartable goal renders `.goalline`; a too-far goal and no-goal render none

## Scope (out)
- No state-lift of the goal out of WealthPanel (direct read keeps 17l/m/p untouched); no engine change → no redeploy
- No range fold for a far goal (would flatten the chart) — the WealthPanel covers those

## Subsystems touched
- packages/ui/src/components/WorthChart.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] chartable goal → `.goalline` at the goal worth + a 🎯 note; too-far (>3× peak) and no-goal → none
- [x] UI suite (418, +1) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- The direct localStorage read updates within a tick (or next render when paused) — acceptable for a chart, vs the churn of lifting goal state to App.
