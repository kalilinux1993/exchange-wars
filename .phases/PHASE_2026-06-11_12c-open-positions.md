# Phase: Exchange Wars — Phase 12c: Open Positions Panel (Brick 107)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading — turn the one-item ticket cost-basis into a whole-satchel portfolio glance)
**Goal:** A single "Open Positions" panel listing every item the player currently HOLDS with avg cost → live mark → unrealized P&L (gp + %), clickable to load in the ticket. UI-only, live on main.
**Done condition:** per-held-item position row (avg/mark/paper P&L), header paper-total, click-to-select, empty state; suite + e2e green; no engine change → no verify-score redeploy. **MET.**

## Gap this fills
Cost basis only ever showed for the ONE selected item (TradeTicket position line, 11i). ProfitPanel shows only *realized* (closed) profit. Nowhere could you see all your open positions and their *unrealized* P&L at once — you had to click each market row in turn. This is the unrealized sibling of ProfitPanel's realized rows: the satchel marked to market in one look ("which position is underwater / ripe to take profit").

## Outcome
- `game.ts`: `heldPositions(book, markOf)` → `HeldPosition[]` — pure (price lookup injected, book iterated in sorted-id order), one row per open bought position: `{itemId, units, avgCost, mark, marked, value, cost, unrealized, unrealizedPct}`. Sorted best paper P&L first (id tie-break). An unmarked position (no live price, `markOf ≤ 0`) is listed *flat* (`mark = avgCost`, `unrealized = 0`) rather than shown as a fake total loss. Deliberately named `heldPositions`/`HeldPosition` (not `openPositions`) to avoid a one-letter collision with the existing fills-based `openPosition`.
- `components/PositionsPanel.tsx`: new panel, modelled on ProfitPanel — header carries `value … · paper ±…`; rows show `name ×units  avg→now  +P&L (+pct%)` colour-coded; click → `onSelect` (loads the item in the ticket, same proven path as the market/profit rows); empty state; "+N more held…" overflow line. Marks at `view.markets[].lastPrice` (same convention as the ticket's "marked at last price"). No new CSS — reuses `.panel/.rows.small/.mover/.pct`; `.rows li` flex+space-between absorbs the extra 4th span cleanly.
- `App.tsx`: mounted directly below ProfitPanel in the Exchange room.
- Tests (+5): `heldPositions` truth table (winners-first sort, marked up/down with exact value/cost/unrealized/pct, unmarked-is-flat, empty→[]) + PositionsPanel render (row `100→130`, `+300` paper appears on row & header, click→onSelect) + empty state. 289/289 unit, 9/9 e2e. FINDINGS #141.

## Gates
- [x] `heldPositions` pure truth table (sort, mark up/down/unmarked, empty)
- [x] Panel renders rows + header total + selects on click; empty state
- [x] Typecheck + 289 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Per-row one-click "sell all" (reuse the 11u path) — v1 navigates to the ticket instead, which already has it.
- Sort toggle (by P&L / by value / by name), if the held list ever gets long.
