# Phase: Exchange Wars — Phase 16y: Sortable swing column (market-wide volatility) (Brick 233)

**Started:** 2026-06-12
**Hat:** Builder (trading decision tool — find steady vs wild spreads)
**Goal:** Add a sortable "swing %" column to the MarketTable — recent peak-to-trough volatility per item
(reusing `priceSwing`), so the whole market is sortable by choppiness: ascending = steadiest (safest flips),
descending = wildest (volatility plays). The 14p ticket swing read, lifted to a portfolio-level column.
**Done condition:** The MarketTable shows a sortable "swing" column; sorting orders by realized volatility;
suite + e2e green.

## Why this brick
14p added a recent-swing read on the SELECTED item's ticket ("🟢 steady / 🟡 choppy / 🔴 wild"). But the
trader's portfolio question — "which spreads across the WHOLE market are steady enough to flip safely vs
which are too wild?" — needs the same metric as a sortable column, like margin (14d) and band (15q) already
are. A wild spread can move before both legs of a flip fill; a steady one holds. This is the third member of
the sortable-decision-columns family (margin = profit, band = value, swing = risk).

## Design — precompute a swings map, add a sortable column
- `MarketTable.tsx`: build `swings: Map<ItemId, PriceSwing|null>` once per render from the SAME
  `sparks` window the row sparkline draws (`priceSwing(arr.slice(-SPARK_POINTS))`); untraded items absent
  → null → '—'. `SortKey` gains `'swing'`; `numOf` returns `swings.get(id)?.swingPct ?? null` (nulls sink).
  A new sortable `<th>swing</th>` + a cell showing the peak-to-trough %, coloured by read (steady→green,
  wild→red, choppy→plain), titled with the lo–hi range.

## Scope (in)
- `MarketTable.tsx`: swings map + SortKey + numOf branch + header + cell
- `app.test.tsx`: a swing-column render/sort test (steady vs wild ordering)

## Scope (out)
- No engine change, no new CSS (reuse num/up/down/pct) — no redeploy
- No change to `priceSwing` (14p, already tested) or other columns

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] swing column renders, is sortable, orders by realized volatility; untraded → '—' sinks
- [x] UI suite (393, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the margin (14d) / band (15q) sortable-column pattern exactly.
