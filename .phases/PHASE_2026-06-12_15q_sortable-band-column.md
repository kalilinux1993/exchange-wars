# Phase: Exchange Wars — Phase 15q: Sortable Value-Band Column (Brick 199)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — full-market valuation lens)
**Goal:** Make the whole market sortable by where each item sits in its cost→value band — a numeric
`bandPosition` (0..1) backing a sortable "band" column on the market table, so "what's cheapest /
richest across the board, fundamentally" is one click, not a per-row eyeball.
**Done condition:** A sortable 🟢/⚪/🟡 "band" column orders the market cheapest→richest by band
position; `valueBand` re-expressed over the shared `bandPosition` (single source); suite + e2e green.

## Why this brick
`valueBand` (15f) categorizes one price as cheap/fair/rich, surfaced on 5 read-surfaces — but always
as a per-item glance. The market table can sort by bid/ask/last/margin/vol, yet not by fundamental
value position. A sortable band column turns the band into a *ranking*: sort ascending to see the
whole market's best accumulation candidates first; descending for offload candidates. It subsumes the
queued "rich track" (a sort reveals both ends, not just one filter) and "value-band as a sortable
column" in one move. The investigation that picked this brick first ruled out "fills while away":
the engine's 512-trade rolling window (`exchange.ts:6`) evicts a player's away-fills long before the
post-catch-up `recordFills`, so that feature needs an engine-side fill accumulator (replay-affecting,
Jesse-gated) — not a clean UI brick. (Verify-the-mechanism before building.)

## Design
- `game.ts`: extract `bandPosition(def, lastPrice): number | null` — the clamped (last−base)/(value−base)
  fraction `valueBand` already computes internally. Refactor `valueBand` to categorize `bandPosition`'s
  result (`<0.34 cheap / <0.67 fair / rich`) so the threshold logic lives in exactly one place.
- `MarketTable.tsx`: add `'band'` to `SortKey`; a sortable "band" `<th>`; a body cell rendering the
  🟢/⚪/🟡 from `valueBand` (— when no band); `numOf` returns `bandPosition` for the sort (nulls sink).

## Scope (in)
- `game.ts`: `bandPosition` + `valueBand` refactor (output category UNCHANGED — all 5 callers safe)
- `MarketTable.tsx`: band column (header + cell + sort wiring)
- `app.test.tsx`: sorting the band column orders a cheap item ahead of a rich one

## Scope (out)
- No new track filter (the sort reveals both ends — supersedes a one-sided "rich" track); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `valueBand` output unchanged after the refactor (existing valueBand test green — the 5 callers can't regress)
- [x] sorting the band column ascending puts a cheap item above a rich one
- [x] UI suite (342, +2: band-column sort + `bandPosition` unit) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `valueBand`'s exact math; the refactor is behaviour-preserving by construction.
