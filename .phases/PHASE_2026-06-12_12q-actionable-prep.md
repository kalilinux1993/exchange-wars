# Phase: Exchange Wars — Phase 12q: Actionable Preparedness Fixes (Brick 121)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG/UX — turn the 12p prep warnings from informative into actionable)
**Goal:** Beside each pre-embark warning, a one-click "+ pack <item>" chip that adds the missing antifire/food from your bank, clearing the warning. UI-only, live on main.
**Done condition:** fix chip on each warning when you own a fixing item; clicking it packs the item and clears the warning; pure helper + integration tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12p warned "you forgot antifire" but left you to find and pack it by hand. An informative warning is half a feature; the other half is the fix. The chip closes the gap between knowing and doing — one click, warning gone.

## Outcome
- `game.ts`: `embarkPrep` now returns `EmbarkWarning[]` (`{kind: 'antifire'|'food', text}`) instead of bare strings, so the UI knows what fixes each warning.
- `ExpeditionPanel.tsx`: for each warning, if you OWN a fixing consumable (antifire → `CONSUMABLES.antifire`; food → `heal>0`, sorted-id pick for stability), render a "+ pack <item>" chip that `bump`s one into the draft. Packing it flips the detection boolean → the warning clears on re-render.
- Tests: `embarkPrep` tests updated to the structured shape (+1 net) + an integration test that reuses the 12l region-jump to land on a fire region, asserts the antifire warning, clicks the pack chip, and asserts the warning clears. 338/338 unit, 9/9 e2e. FINDINGS #155.

## Clean test path (worth noting)
Fire regions are normally locked for a fresh player, so the embark warning is hard to reach in a test. The 12l `regionPick` jump (seed a Delve Log row for `dragons_maw`, click "raid here again") selects the region on the embark screen WITHOUT needing questProgress — letting the integration test exercise the chip end-to-end. A mechanism built two bricks ago became the test fixture for this one.

## Gates
- [x] `embarkPrep` structured warnings (pure, updated tests)
- [x] Pack chip adds the item + clears the warning (integration test)
- [x] Typecheck + 338 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A "prep me" button that fixes ALL warnings at once.
