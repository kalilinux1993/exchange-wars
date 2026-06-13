# Phase: Exchange Wars — Phase 20d: aria-pressed on toggle controls (screen-reader state) (Brick 316)

**Started:** 2026-06-13
**Hat:** Builder (a11y — WCAG 4.1.2 Name/Role/Value; the 4th dimension after motion/live-regions/modal-focus)
**Goal:** `aria-pressed` was already used on some toggles (compact, watchstar, filter-track `on`, watchlist
armed) but missing on others that show state ONLY via a CSS `active` class — the buy/sell side, the market
filter tracks, Positions sort, TopFlips fit-only, TradeFeed mode. A screen reader couldn't tell which was
active. Add `aria-pressed` to finish the convention.
**Done condition met:** yes — each toggle carries `aria-pressed={<the condition that sets 'active'>}`; a test
pins the side toggle's pressed state flipping on click; suite + e2e green; typecheck clean.

## Design
- Add `aria-pressed` to: `TradeTicket` side buy/sell, `MarketTable` filter tracks, `PositionsPanel` sort,
  `TopFlips` fit-only, `TradeFeed` mode. Mechanical — the pressed value IS the active-class condition.

## Scope (in)
- packages/ui/src/components/{TradeTicket,MarketTable,PositionsPanel,TopFlips,TradeFeed}.tsx
- packages/ui/test/app.test.tsx (pin the side toggle's aria-pressed)

## Scope (out)
- Sortable column headers (those want `aria-sort`, a separate dimension); no engine change → no redeploy

## Gates
- [x] each listed toggle exposes aria-pressed matching its active state; side-toggle test green
- [x] UI suite (+1=483) + e2e (14) green; typecheck clean
- [x] UI-only — no engine change, no redeploy

## Open questions
- Possible next a11y dimensions: `aria-sort` on sortable table headers; palette contrast.
