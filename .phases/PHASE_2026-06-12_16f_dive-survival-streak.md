# Phase: Exchange Wars — Phase 16f: Dive Survival Streak (Brick 214)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — adventure retention / risk-management hook)
**Goal:** Surface a consecutive-clean-extraction streak on the Delve Log — "🔥 N clean (best M)" — so the
careful-extraction behaviour the push-read/extract loop already rewards has a number to protect, adding
stakes to the "bank or push?" call.
**Done condition:** The Delve Log header shows the current trailing survived-dive streak + the best-ever
run, computed from the delve history; suite + e2e green.

## Why this brick
The adventure loop has rich risk instrumentation (push-read at current hp 13p, at-stake loot on the extract
button 13o, extract recap 15n) but no running REWARD for playing the odds well across dives. A survival
streak turns "I extracted in time" from a one-off into a thing you're building — and a death doesn't just
forfeit one dive's loot, it breaks the streak, which is exactly the extra tension that makes the push/bank
decision matter. Pure breadth pivot away from the long trading/band/leaderboard run; the adventure analog
of the daily login streak (10s), reusing the latched `Game.delves` history (no engine change).

## Design — a pure single-pass helper + one header readout
- `game.ts`: `diveStreak(delves)` → `{ current, best }`. One pass: `run = d.died ? 0 : run + 1; best =
  max(best, run)`; at loop end `run` IS the trailing (current) streak. A death resets the run; a survived
  dive extends it. Pure; empty/undefined → `{0, 0}`.
- `DelvePanel.tsx`: in the header, after the banked/lost figures, "🔥 {current} clean" (+ "(best {best})"
  when best > current), shown when there are runs.

## Scope (in)
- `game.ts`: `diveStreak` + `DiveStreak` interface
- `DelvePanel.tsx`: the streak readout in the header
- `app.test.tsx`: `diveStreak` unit (trailing run resets on a death; best survives a later break)

## Scope (out)
- No "new streak record!" celebration toast this brick (a possible follow-up reusing the 15e onDelveEnd
  detection); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/DelvePanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `diveStreak` returns the trailing survived-dive count as `current` and the longest run as `best`; a death resets the trail but not the best (5 cases pinned)
- [x] the Delve Log header shows "🔥 {current} clean (best {best})" when best > 0
- [x] UI suite (362, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the latched `delves` history.
