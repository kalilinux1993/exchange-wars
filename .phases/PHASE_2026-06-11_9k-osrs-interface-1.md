# Phase: Exchange Wars — Phase 9k: The OSRS Interface, step 1 (Brick 37, Jesse-directed)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder/Designer (Jesse: OSRS HUD — skills/quests side panel, a map, a player model, deeds too long)
**Goal:** First concrete step of the OSRS-interface arc, three pieces, all pure SVG/CSS over existing state (no engine change): a visual region MAP (node-graph trail), a player PAPERDOLL + skills strip, and the 31-deed wall COMPACTED to a badge grid. Highest-impact lowest-ambiguity slice; deeper/animated art is the rest of the arc.
**Done condition:** map + paperdoll + compact deeds shipped; region names still queryable/accessible; suite + e2e green; screenshot regenerated. **MET.**

## Outcome
- RegionMap.tsx: 8 regions on a winding SVG trail; locked/frontier/cleared/selected; ★ elite regions; names as <text> (getByText + a11y preserved); click unlocked to select; flavor line below.
- CharacterPanel.tsx: paperdoll (armor plates light per best-usable-gear-per-slot, mirrors deriveStats) + equip list + skills strip (atk/def/hp, xp-to-next bars) + hp bar.
- MilestonesPanel: badge grid (all deeds, ◆/◇ with hover titles) + top-3 closest-to-done inline.
- styles.css: map/paperdoll/skills/deedgrid. Wired into the Adventure room; ExpeditionPanel stat-line + region <ul> replaced.
- 185/185 (one deed-% test moved to badge-title assertions); 9/9 e2e; README screenshot regenerated. No engine change, no fn redeploy. FINDINGS #71.

## Gates
- [x] Region names queryable/accessible (SVG <text>)
- [x] Suite + e2e green; screenshot refreshed
- [x] Jesse-gate flagged: confirm SVG direction before deeper art investment
