# Phase: Exchange Wars — Phase 14d: Market Flip-Margin Column (Brick 160)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading; make the WHOLE market sortable by flippability)
**Goal:** A sortable "margin" column on the market table showing per-row after-tax flip margin.
**Done condition:** the market table shows a `margin` column (sortable) with the same after-tax margin TopFlips ranks; suite + e2e (incl. mobile) green. **MET.**

## Why this brick
TopFlips ranks the top 4 flips; the full 128-item market table had no per-row margin, so you couldn't scan or sort the WHOLE market by flippability (e.g. to find affordable flips, or flips in a category, beyond the top few). Distinct from TopFlips (a ranked strip) — this is the full-market lens.

## Design — reuse the TopFlips margin math, as a sortable column
- `flipMargin(m)` (module-local): undercut the spread one tick each way, net the GE tax — the exact sum `rankFlips` computes, per row; null when there's no two-sided book.
- New sortable `margin` column (between last and trend): green for a positive margin, dim "—" when no book. `numOf` returns `flipMargin(m)` for the `margin` sort key, so the existing null-sinks-to-bottom sort logic just works.
- Verified the 7th column doesn't break the phone-sized layout (mobile e2e passes).

## Outcome
- `MarketTable.tsx`: `flipMargin` helper; `margin` SortKey + header + cell; `numOf` case.
- Tests (+1): a 1000/1100 book renders a "+77" margin cell under a sortable "margin" header.

## Gates
- [x] margin column renders the after-tax margin, sortable (render test)
- [x] UI suite (283, +1) + e2e (9, incl. mobile viewport) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- A margin% (ROI) variant, or a min-margin filter, if scanning the full market by margin proves popular.
