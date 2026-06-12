# Phase: Exchange Wars — Phase 14k: Equipped-Kit Value Note (Brick 167)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — transparency follow-up to the 14j net-worth fix)
**Goal:** Show how much of your net worth is equipped gear.
**Done condition:** WealthPanel shows a "🛡 X equipped kit" note (liquidation value of worn gear); suite + e2e green. **MET.**

## Why this brick
14j made equipped gear count toward net worth (so it lumps into "in goods"). This surfaces how much of your worth is kit you're wearing — parallel to the existing "⚔ at risk in the wild" expedition-loot note. Honest transparency on the 14j change.

## Design — sum bidWalk over worn, informational note
- `kit = Σ bidWalk(game, itemId, 1).gp` over `view.worn` (guarded `?? {}`). Shown as a green note beside the composition when > 0. Informational (doesn't re-segment the bar), like the at-risk note.

## Outcome
- `WealthPanel.tsx`: kit computation + the note.
- Tests (+1): a low resting bid gives a worn weapon value; the panel shows "equipped kit". (Test learning: a bid at 1000 matched a newGame-seeded sell and didn't rest — a price-5 bid rests below the sells. And `view.worn` must be guarded `?? {}` — partial-view tests omit it.)

## Gates
- [x] kit value note renders from worn gear's liquidation value (render test)
- [x] UI suite (290, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r+14j)

## Follow-ups
- None — the worn-gear-worth thread (14j counts it, 14k shows it) is complete.
