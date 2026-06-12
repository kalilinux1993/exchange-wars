# Phase: Exchange Wars — Phase 11t: Deed Markers on the Fortune Curve (Brick 98)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (visualization — tie achievements to the wealth curve)
**Goal:** Mark each earned deed as a dot on the Fortune chart at its (tick, worth), using the achievement ticks recorded in 11s. UI-only, live on main.
**Done condition:** earned deeds within the chart's tick range render as markers with a name tooltip; off-range skipped; suite + e2e green. **MET.**

## Outcome
- `components/WorthChart.tsx`: optional `milestones={tick,name}[]` prop; renders a `.deedmark` `<circle>` at `(x(tick), y(ghostWorthAt(history, tick)))` for each deed with `minT ≤ tick ≤ maxT`, with an SVG `<title>` tooltip "🏅 {name}". Reuses `ghostWorthAt` to sit the dot on the line at the interpolated worth.
- `App.tsx`: passes earned deeds with recorded ticks (`game.milestones` ∩ `game.milestoneTicks`, named via `MILESTONES`).
- `styles.css`: `.worth .deedmark` (gold dot, ink outline).
- Tests: marker for an in-range deed (tick 100 in [0,200]) renders with the name; an out-of-range deed (tick 500 > 200) is skipped — exactly 1 `.deedmark`. 269/269 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #132.

## Notes
- Range filter handles the 240-sample worthHistory cap: deeds earned before the oldest retained sample have no curve and are skipped.

## Gates
- [x] In-range deeds marked on the curve; off-range skipped (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
