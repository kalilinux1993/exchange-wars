# Phase: Exchange Wars — Phase 17h: A "steady" market filter track (Brick 242)

**Started:** 2026-06-12
**Hat:** Builder (trading — the risk-averse flipper's one-click view)
**Goal:** Add a "steady" track to the MarketTable filter row — show only items whose recent price action is
calm (priceSwing read === 'steady') AND liquid (it has recent trades). The low-risk-flip subset, where the
spread holds while both legs fill.
**Done condition:** The "steady" track shows only items with a 'steady' swing read; suite + e2e green.

## Why this brick
16y added a sortable swing COLUMN (rank by volatility) and the per-item ticket read; the missing piece for a
risk-averse flipper is a one-click FILTER to "just the calm, tradeable markets" — sorting still shows the
wild ones, you just scroll past them. "steady" removes them, leaving the reliable-flip candidates (calm +
actually trading). Reuses the `swings` map already computed for the column (16y), so it's a one-line
predicate, mirroring the cheap/watched/flippable tracks.

## Design — one predicate (read === 'steady'), reusing the swings map
- `MarketTable.tsx`: add `'steady'` to the `track` union, the track-button array (+ a title), and `inTrack`
  (`track === 'steady'` → `swings.get(id)?.read === 'steady'`). Untraded items (no swing data) are excluded
  — "steady" means demonstrably calm AND liquid, not merely unmeasured.

## Scope (in)
- `MarketTable.tsx`: `'steady'` track (union + chip + predicate)
- `app.test.tsx`: the "steady" track shows only steady-read items, excludes wild + untraded

## Scope (out)
- No engine change — no redeploy
- No change to the 16y swing column/cell

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] "steady" track shows only items with a 'steady' priceSwing read; wild + untraded excluded
- [x] UI suite (405, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — a direct mirror of the cheap/watched track predicates, over the existing swings map.
