# Phase: Exchange Wars — Phase 11l: Region Danger Readout (Brick 90)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (adventure HUD — a pre-embark danger read)
**Goal:** Before embarking, show the hardest-hitting foe that stalks the selected region (pool + named elite), to weigh against your own Attack/Defence. UI-only, live on main.
**Done condition:** pure `regionDanger` with a truth-table test; a danger line under the region flavor; suite + e2e green. **MET.**

## Outcome
- `components/ExpeditionPanel.tsx`: `regionDanger(region)` — the max-`atk+def` monster across `region.monsters` + any `region.elite`, returning `{atk, def, hp, elite}`. Pure (reads `monsterById`). Rendered as "danger: foes up to ⚔N 🛡M · H hp · ☠ a named terror lurks here" under the region flavor in the no-expedition branch.
- Honest factual readout (no fragile ready/not verdict, which would need a pack-dependent survivability model). Includes the elite so "danger" = worst case, not average. Auto-folds Skarn/deeper elites once PR #1 merges (reads `region.elite`).
- Tests: pure `regionDanger` (wilderness_ruins → fire_giant 19/11/85 no elite; Maw → elite true, atk ≥30) + an App render asserting the danger line shows. 258/258 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #124.

## Gates
- [x] regionDanger reports the hardest foe incl. elite (pure test)
- [x] Danger line renders pre-embark (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
