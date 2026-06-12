# Phase: Exchange Wars — Phase 14g: "Flippable" Market Track (Brick 163)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading; the full-market actionable view)
**Goal:** A market track filter that shows only items with a positive after-tax flip margin right now.
**Done condition:** a "flippable" track keeps only positive-margin items; suite + e2e green. **MET.**

## Why this brick
14d added a margin column (you can sort by it); this declutters — a "flippable" track filters the 128-item market to ONLY the items whose spread clears the 2% tax right now. The full-market actionable view (TopFlips shows only the top 4); reuses 14d's `flipMargin` + 13j's track-filter pattern.

## Design — one more track case, reuse flipMargin
- `inTrack` now takes the market row (not just the id) so it can compute `flipMargin(m)`; the `flippable` case keeps `margin !== null && margin > 0`.
- The track-chip array gains `flippable` beside all/staples/exotics/gear. A live filter (margin changes per tick) — fine, it just re-filters each render.

## Outcome
- `MarketTable.tsx`: `inTrack(m)` with a `flippable` case; `flippable` chip.
- Tests (+1): a wide spread (flippable) and a thin one (margin < 0); the "flippable" track keeps only the wide.

## Gates
- [x] flippable track keeps only positive-margin items (render test)
- [x] UI suite (285, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- A margin-ROI (%) sort/column variant, or an affordability filter (margin × what your gp can do), if full-market flip-scanning proves popular.
