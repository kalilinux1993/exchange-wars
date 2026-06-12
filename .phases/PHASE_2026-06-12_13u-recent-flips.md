# Phase: Exchange Wars — Phase 13u: Recent Flips (per-round-trip journal) (Brick 151)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading review; the one missing trade view)
**Goal:** Show recent COMPLETED round-trips with per-flip net profit.
**Done condition:** a `recentFlips` pure helper (FIFO-match sells to buys, net the tax) + a "flips" mode on TradeFeed; suite + e2e green. **MET.**

## Why this brick
A genuinely NEW view, not another readout of an existing number. The cockpit had per-ITEM realized P&L (ProfitPanel) and raw unmatched fills (TradeFeed "mine"), but no PER-FLIP view: "this Shark round-trip made +470." That's the "did my last few trades actually work?" glance neither existing surface gives.

## Design — pure FIFO over the fills window, a third TradeFeed mode
- `recentFlips(fills, taxRate, limit)` (game.ts, pure): mirrors `applyFillToBook`'s FIFO and tax (`price − floor(price·tax)` per unit) but KEEPS per-flip detail instead of aggregating. Each sell matched against earlier buys emits `{itemId, qty, buyAvg, sellPrice, profit, tick}`; a sell with no matching buy (dumped loot) yields nothing. Newest first.
- TradeFeed gains a third mode `flips` beside tape/mine — SAME fills data, FIFO-matched. Coherent (one data source) and non-duplicative: tape = all market trades, mine = my raw fills, flips = my completed round-trips with profit.

## Outcome
- `game.ts`: `recentFlips` + `FlipRecord` interface.
- `TradeFeed.tsx`: `flips` mode toggle + render (×qty, buyAvg→sellPrice, signed profit).
- Tests (+4): `recentFlips` (FIFO+tax math; drops unmatched sells; blends lots + newest-first) + a TradeFeed render of the flips mode.

## Gates
- [x] recentFlips FIFO/tax correct, drops unmatched sells, newest-first (3 unit tests)
- [x] TradeFeed flips mode renders a round-trip with profit (render test)
- [x] UI suite (271, +4) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- The flips window is capped (FILLS_CAP=50) — for full history a persisted per-flip log would be needed (engine/save change); the rolling window is the right UI-only scope.
