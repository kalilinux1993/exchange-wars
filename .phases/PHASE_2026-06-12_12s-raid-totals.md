# Phase: Exchange Wars — Phase 12s: Raid Risk/Reward Totals (Brick 123)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG — aggregate the Delve Log into raiding P&L)
**Goal:** Show lifetime raid risk/reward in the Delve Log header — loot banked (survived) vs lost (deaths), the raiding counterpart to trading realized profit. UI-only, live on main.
**Done condition:** Delve Log header shows runs + banked + lost from the log; pure helper tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12i logged each delve but never aggregated them — the adventure loop had per-raid history but no bottom line, while trading has a realized-profit total. `raidTotals` gives the missing figure: across all delves, how much loot you've kept vs forfeited to deaths. It's an accurate aggregation (the Delve Log's own `lootGp` summed by outcome), not a fragile cross-loop attribution — banked = survived loot, lost = death loot, no double-counting.

## Outcome
- `game.ts`: `raidTotals(delves)` → `{runs, deaths, banked, lost}`, pure.
- `DelvePanel.tsx`: header now reads "N runs · X banked · Y lost" (lost only when nonzero), green/red — replacing the bare "N logged" count with the risk/reward bottom line.
- Tests (+1): pure `raidTotals` (undefined → zeros; survived sum to banked, died to lost, counts) + the existing DelvePanel render updated to assert "2 runs" + "banked"/"lost". 341/341 unit, 9/9 e2e. FINDINGS #157.

## Gates
- [x] `raidTotals` pure (banked/lost split + counts)
- [x] DelvePanel header shows the totals (render test)
- [x] Typecheck + 341 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A net raid P&L (banked − lost) and a survival rate (runs − deaths)/runs, if the split proves too coarse.
