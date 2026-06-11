# Phase: Exchange Wars — Phase 10y: Compact Big Numbers (Brick 77)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (readability/idle-game polish — scannable headline numbers at scale)
**Goal:** Compact the *approximate* headline aggregates (net worth, delta, earning rate) to 12.3K/1.23M/1.5B while keeping exact figures (gp cash, prices, quantities) precise; full value in tooltips. UI-only, no engine change.
**Done condition:** pure `fmtCompact` (Intl compact, <10k exact) with tests; applied to the masthead net/delta/rate with exact-value titles; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `fmtCompact(n)` — `Intl.NumberFormat({notation:'compact', maximumSignificantDigits:3})` for |n|≥10k, exact-with-commas below. Module-level formatter (UI package; not the engine, Intl is fine).
- `App.tsx`: masthead net worth + all-time delta + the 10x gp/min rate now use `fmtCompact`, each with a `title` carrying the exact comma value. Cash gp, prices, quantities untouched (precision matters there).
- Tests: `fmtCompact` truth table (0, 9_999 exact; 10K/12.3K/1.23M/-45.7K/1.5B) + 1 render (a +100,000/min rate compacts to "+100K gp/min"). 237/237 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #111.

## Notes
- Pre-existing `getAllByText('55,000').length > 0` test survived (gp alone satisfies it); `+0` fresh-delta survived (`fmtCompact(0)`="0"). Grep tests for the OLD display string when changing a format.

## Gates
- [x] fmtCompact compacts ≥10k to 3 sig figs, keeps <10k exact (pure test)
- [x] Masthead aggregates compacted with exact tooltips (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
