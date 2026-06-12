# Phase: Exchange Wars — Phase 12z: Next-Deed Progress Bars (Brick 130)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (polish — make next-goal progress a glance, in the game's established bar language)
**Goal:** Add a thin progress bar to each of the closest-unearned deeds in the MilestonesPanel (which showed bare "62%" text). UI-only, live on main.
**Done condition:** a progress bar on each next-deed with progress > 0; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
The MilestonesPanel floats the 3 closest unearned deeds with their progress as text percentages. The game already speaks a consistent progress-bar visual language (bounty 11z, conquest 12f, allocation 12k) — the deeds list was the one progression surface still text-only. A bar turns "how close am I" into a glance.

## Outcome
- `MilestonesPanel.tsx`: each next-deed with `pct > 0` now renders a `.deedbar` (width = pct) alongside the % text; `· · ·` for no-progress deeds is unchanged.
- `styles.css`: `.deedbar` (48px inline gold bar, mirroring `.conquestbar`/`.deedbar` family).
- Tests (+1): MilestonesPanel render — at start worth the 100k-worth deed sits at 50%, so a `.deedbar` is present (`querySelectorAll('.deedbar').length > 0`). 355/355 unit, 9/9 e2e. FINDINGS #164.

## Gates
- [x] Deed bars render on progress-bearing next-deeds (render test)
- [x] Typecheck + 355 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- (none — the progression surfaces are now visually consistent.)
