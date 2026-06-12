# Phase: Exchange Wars — Phase 12l: Delve Log "Raid Here Again" (Brick 116)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG/UX — make the Delve Log actionable, connecting the Hall history back to the adventure loop)
**Goal:** Click a Delve Log row to jump to the Adventure tab with that region pre-selected. UI-only, live on main.
**Done condition:** Delve Log rows are clickable; a click switches to the Adventure tab and pre-selects the row's region; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12i made the Delve Log a passive chronicle. The obvious next step is making it actionable — a "raid here again" shortcut that closes the loop from looking back (Hall) to going again (Adventure). A different *kind* of feature than the session's readouts: a cross-room action.

## Key reuse
Rather than lift ExpeditionPanel's local `regionId` to App (invasive, and it'd make region selection a controlled prop touching the e2e-covered expedition flow), I mirrored the proven **ticket-prefill nonce pattern**: a `{regionId, n}` pulse from App that ExpeditionPanel applies via a nonce-guarded effect. The same shape the TradeTicket already uses for "load this price" — repeat clicks on the same region re-fire because the nonce changes; ExpeditionPanel keeps its own state and just accepts the pulse.

## Outcome
- `App.tsx`: `regionPick` state + `regionPickNonce` ref + `jumpToRegion(regionId)` (pulse + `pickRoom('adventure')`); passes `regionPick` to ExpeditionPanel and `onPick={jumpToRegion}` to DelvePanel.
- `ExpeditionPanel.tsx`: `regionPick?` prop + a nonce-guarded effect applying it to local `setRegionId` (mirrors the TradeTicket prefill effect).
- `DelvePanel.tsx`: `onPick?` prop; rows gain the `mover` class (cursor/hover) + an onClick → `onPick(d.regionId)` + a "click to raid here again" title, only when `onPick` is wired.
- Tests (+2): DelvePanel row click → `onPick(regionId)`; App-level — clicking a seeded Delve Log row flips the Adventure tab to `aria-selected=true` (targeted via the unique "raid here again" title to avoid the region-name collisions across RegionMap/Conquest/embark). 326/326 unit, 9/9 e2e. FINDINGS #150.

## Gates
- [x] Row click fires onPick with the region (unit)
- [x] App click switches to the Adventure tab (integration)
- [x] Typecheck + 326 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Optionally scroll/flash the picked region on the RegionMap when jumped to.
