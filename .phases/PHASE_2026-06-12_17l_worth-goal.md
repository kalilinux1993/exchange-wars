# Phase: Exchange Wars — Phase 17l: Set your own worth goal (Brick 246)

**Started:** 2026-06-12
**Hat:** Builder (retention — player-set targets, not just fixed deeds)
**Goal:** Let the player set a custom net-worth target in the WealthPanel and track it — progress % + an ETA
("≈8m") at the recent worth rate, clearable, persisted. The flexible sibling of the fixed worth-deed ETAs
(17k): pick ANY number (e.g. "200k to afford the next slot"), not just the deed thresholds.
**Done condition:** Setting a target shows its progress + ETA; reaching it shows "✓ reached"; clearing it
returns the input; the target persists; suite + e2e green.

## Why this brick
17k gave ETAs to the FIXED worth deeds (six-figures, millionaire, …). But a player often has a SPECIFIC
near-term number in mind — save 200k for a slot, hit 500k before a restart — that no deed marks. A settable
goal with the same progress+ETA treatment gives that agency. Reuses the worth-rate projection (worthRate +
the `eta*60`/fmtDuration formatting), persisted via `usePref` like the watchlist/loadouts.

## Design — a pure `goalView` + a small set/clear widget in the WealthPanel
- `game.ts`: `goalView(goal, worth, perMin): GoalView | null` — pct (capped 100), gp remaining, etaMin
  (tick-minutes, null if reached or rate ≤ 0), reached. null when no goal (goal ≤ 0). Pure.
- `WealthPanel.tsx`: `usePref<number>('ew-worth-goal', 0)` + a local input. No goal → a "🎯 set a worth
  target… [set]" input (Enter or click commits a positive integer). Goal set → "🎯 goal {G}: {pct}% · ≈{eta}"
  (or "✓ reached!") + a ✕ clear. Reuses `worthRate(game.worthHistory)`.
- `styles.css`: a compact `.goalinput`.

## Scope (in)
- `game.ts`: `goalView` + `GoalView`
- `WealthPanel.tsx`: the goal widget (usePref + input + progress/ETA line)
- `styles.css`: `.goalinput`
- `app.test.tsx`: `goalView` unit + a WealthPanel render (set → progress+ETA, clear → input back)

## Scope (out)
- No "goal reached!" toast/celebration (passive "✓ reached" — avoids a baseline/swap-guard; can follow later)
- No engine change — no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/WealthPanel.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] `goalView` null on no-goal; pct (capped 100)/remaining/etaMin/reached correct; etaMin null when reached or rate ≤ 0
- [x] set a target → progress + ETA render; ✕ clears back to the input; persisted via usePref('ew-worth-goal')
- [x] UI suite (410, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the 17k/11w worth-rate projection + the usePref persistence pattern.
