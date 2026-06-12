# Phase: Exchange Wars — Phase 15i: Watchlist Decision Board (Brick 191)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — market decision-support)
**Goal:** Turn the watchlist from a price+alert list into a decision board — show each starred
item's flip margin and value-band position, so "which of my watched items is the best buy now?"
is one glance.
**Done condition:** Each WatchlistPanel row shows its after-tax flip margin + cheap/fair/rich
value-band tag, beside the existing price/trend/alerts; suite + e2e green.

## Why this brick
The watchlist is your curated shortlist, but it only showed price + trend + alerts — to judge
whether a watched item is actionable you still had to load each into the ticket. Adding the two
decision metrics (flippability now, value position) makes the watchlist a self-contained "act or
wait?" board for the items you already care about. Reuses `valueBand` (15f) and `flipMargin`.

## Design — extract flipMargin (single source) + a compact readout
- `flipMargin(m)` was LOCAL to MarketTable; extract it to game.ts (export) and have BOTH MarketTable
  and the watchlist call it — single source, the same extract-then-reuse as 15f's `valueBand` (the
  market column and the watchlist row can never disagree on a margin).
- WatchlistPanel: per row, a compact "flip +N · 🟢/🟡/⚪" indicator — `flipMargin(m)` (green when >0)
  + `valueBand(def, lastPrice)` dot — built from the `items` + `view` it already has.

## Scope (in)
- `game.ts`: `flipMargin` (extracted, exported)
- `MarketTable.tsx`: import the shared `flipMargin`, drop the local copy
- `WatchlistPanel.tsx`: the flip-margin + value-band readout per row
- `app.test.tsx`: `flipMargin` unit (two-sided book / one-sided → null / tax) + a WatchlistPanel render

## Scope (out)
- No volume/spread columns on the watchlist (margin + value are the decision metrics); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/components/WatchlistPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `flipMargin`: two-sided book nets the 2% tax (100/110 → +6); one-sided / non-positive legs → null
- [x] WatchlistPanel shows flip margin + value-band per starred row (flip +6 · 🟢); MarketTable margin column unchanged (full suite green)
- [x] UI suite (335, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuse + a compact readout.
