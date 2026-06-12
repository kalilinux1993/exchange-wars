# Phase: Exchange Wars — Phase 12k: Portfolio Concentration (Brick 115)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (trading — add the risk/diversification lens to the positions view)
**Goal:** On the Open Positions panel, show how your held value splits across positions (a stacked allocation bar) and your single biggest exposure ("top X% in <item>"), colour-coded by concentration risk. UI-only, live on main.
**Done condition:** allocation bar + concentration caption on the positions panel; pure helper truth-table-tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
Every trading brick so far measured RETURN (margins, P&L, break-even, cost basis). None measured RISK. Concentration — "62% of your held value is in one item" — is the orthogonal lens: a portfolio can be deeply profitable AND dangerously undiversified. The Open Positions panel (12c) already had the per-item values; this turns them into an at-a-glance risk read.

## Outcome
- `game.ts`: `positionConcentration(positions)` → `{weights (by marked value, largest-first, id tie-break), topPct, count}`. Pure; uses marked-to-market `value` (what's actually at risk now, not cost); empty → zeros.
- `PositionsPanel.tsx`: a stacked allocation bar (one coloured segment per holding, width = value share, hover = item + %) + a caption "N positions · top <item> X%" where the % is red >50% (concentrated), neutral 34–50%, green <34% (well spread).
- `styles.css`: `.allocbar` / `.alloc-seg` (8px segmented bar with hairline dividers).
- Tests (+3): `positionConcentration` (weights/sort/topPct/sum-to-1, empty→zeros) + a PositionsPanel render (two holdings 3000 vs 1000 → "2 positions" + "75.0%"). 324/324 unit, 9/9 e2e. FINDINGS #149.

## Gates
- [x] `positionConcentration` pure (weights desc, topPct, empty)
- [x] PositionsPanel renders the bar + concentration caption (render test)
- [x] Typecheck + 324 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A Herfindahl-style single diversification score, if the top-exposure read proves too coarse.
- "rebalance" hint: suggest trimming the top holding toward a target weight.
