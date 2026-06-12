# Phase: Exchange Wars — Phase 11p: Trading Scorecard (Brick 94)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading — the whole-run bottom line)
**Goal:** A headline scorecard on the Profit panel: total realized P&L (locked in) + unrealized P&L (paper, marked at last price). UI-only, live on main.
**Done condition:** pure `totalRealized` + `totalUnrealized(priceOf)`; ProfitPanel header shows "realized +X · paper +Y"; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `totalRealized(book)` (sums `book.realized.profit`); `totalUnrealized(book, priceOf)` marks each open lot `(price−cost)×qty`, price lookup injected (pure/testable), no-price items skipped.
- `components/ProfitPanel.tsx`: new `view` prop; header renders "realized {±X} · paper {±Y}" (up/down coloured, `fmtCompact`), shown only when either total is non-zero. `priceOf` from `view.markets` lastPrice.
- `App.tsx`: passes `view` to ProfitPanel.
- Tests: pure totals (realized 72; paper +130 from a@130/b@40; 0 with no price) + updated the 2 ProfitPanel renders (added `view`; `getAllByText('+180')` to dodge the row/total collision). 262/262 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #128.

## Gates
- [x] totalRealized + totalUnrealized (pure tests, incl. no-price skip)
- [x] Scorecard header renders; per-item rows still select (render tests)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
