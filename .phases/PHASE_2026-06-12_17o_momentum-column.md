# Phase: Exchange Wars — Phase 17o: A sortable momentum (vs-EMA) column (Brick 249)

**Started:** 2026-06-12
**Hat:** Builder (trading — the 4th decision axis: direction)
**Goal:** Add a sortable "mom" column showing each item's % above/below its smoothed EMA — recent momentum.
Sort descending to find what's spiking (event crazes), ascending to find dips (mean-reversion buys). The
direction axis the table lacked.
**Done condition:** A "mom" column shows `(last−ema)/ema` %, colored up/down, sortable by it; suite + e2e green.

## Why this brick
The MarketTable sorts by margin (profit), band (value vs cost→value), and swing (volatility/risk) — but not
by recent DIRECTION. The `last` cell colors green/red vs EMA but shows neither magnitude nor sortability, so
"what's moving most right now?" (the event-craze / dip-buy question) needs eyeballing. In a market that
mostly sits near EMA except during events, a sortable momentum column surfaces exactly the event-driven
movers — the magnitude+sortability the colored `last` cell can't give. Completes the decision-axis set:
margin=profit · band=value · swing=risk · mom=direction.

## Design — one more sortable column, reusing the EMA already in the view
- `MarketTable.tsx`: `SortKey += 'mom'`; `numOf('mom')` → `ema > 0 ? (last−ema)/ema : null` (nulls sink like
  the others). A sortable `<th>mom</th>` (after `last`, since it's last-vs-EMA) + a cell showing
  `round(((last−ema)/ema)*100)%` coloured up/down (— when no EMA), titled.

## Scope (in)
- `MarketTable.tsx`: `'mom'` SortKey + numOf branch + header + cell
- `app.test.tsx`: a momentum sort orders by % deviation from EMA

## Scope (out)
- No engine change — no redeploy; no momentum FILTER track (sort surfaces movers; a track can come later if wanted)

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] "mom" column shows %-vs-EMA, coloured up/down, sortable by deviation; no-EMA → '—' sinks
- [x] UI suite (413, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the margin/band/swing sortable-column pattern over the existing `ema` field.
