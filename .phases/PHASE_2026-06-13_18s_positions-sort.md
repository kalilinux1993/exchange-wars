# Phase: Exchange Wars — Phase 18s: Open Positions sort lenses + visual QA pass (Brick 279)

**Started:** 2026-06-13
**Hat:** Builder (trading — portfolio-management lenses) + Reviewer (visual QA)
**Goal:** The Open Positions panel caps at 8 rows and sorts by P&L (winners up, underwater down). Add a sort
toggle so the capped view can surface other decision lenses — **value** (biggest exposure) and **band**
(ripest to offload) — not just the P&L default. Also: a visual QA pass on the rendered Exchange tab (via the
screenshot e2e + image read) to catch any layout/legibility regression a green suite can't.
**Done condition met:** yes — a sort chip row (P&L/value/band) reorders the capped list; value-sort surfaces
the biggest holding, band-sort the richest; suite + e2e green. Visual QA: Exchange tab healthy, no regression.

## Why this brick
The panel shows only the top `limit` (8) positions, so for a flipper holding many items the SORT decides
which surface — and the single P&L default hides "what's my biggest exposure?" (value) and "what's ripe to
offload?" (band, the rich end of the cost→value band). Three lenses on the capped view is real portfolio
management. Paired with a visual QA pass (the prior #278/Adventure assessments found real issues a green
suite missed) — re-assessed the Exchange tab after the session's 20 bricks of UI/CSS changes.

## Visual QA outcome (Exchange tab)
Captured the rendered Exchange tab (screenshot e2e) and read it: **healthy** — dark-stone/gold theme intact,
panels render cleanly with sensible empty-states, no overlap / broken layout / contrast or legibility
failure, no regression from the session's additions (incl. the 18k CSS). One state-dependent observation
(the middle Offer/Depth column has tall whitespace on a FRESH world; it fills as you trade) — not safely
re-layout-able blind, left as-is. Screenshot not re-committed (already refreshed 06-12; a fresh +1k capture
is near-identical — the session's post-refresh additions need state to show).

## Design — a sort toggle over the capped view
- `PositionsPanel.tsx`: `useState<'pnl'|'value'|'band'>('pnl')`; `ordered` = positions sorted by the key
  (value desc; band = `bandPosition(def, mark)` desc, nulls sink; pnl = heldPositions' existing unrealized
  desc) before `slice(limit)`. A `.possort` chip row (P&L/value/band), shown when >1 position. Imports `bandPosition`.

## Scope (in)
- `packages/ui/src/components/PositionsPanel.tsx`: sort state + ordered + the chip row
- `packages/ui/test/app.test.tsx`: a sort test (default P&L vs value reorders the capped view)

## Scope (out)
- No name-sort (P&L/value/band cover the decisions); no engine change → no redeploy; screenshot not re-committed (near-identical)

## Subsystems touched
- packages/ui/src/components/PositionsPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] sort chips reorder the capped view: default P&L (B +200 leads), value (A 1,100 leads) — render test
- [x] band sort = `bandPosition` desc (rich first), nulls sink; shown only with >1 position
- [x] UI suite (451, +1) + e2e (11) green; typecheck clean; visual QA: Exchange healthy
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None.
