# Phase: Exchange Wars — Phase 15f: "Cheap" Value-Band Market Track (Brick 188)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — market decision-support)
**Goal:** A market-wide "cheap" lens — filter to items trading in the bottom third of their
fundamental `baseCost..consumeValue` band (accumulation candidates), a signal distinct from
flip-margin or EMA momentum.
**Done condition:** A "cheap" filter track shows only items whose `valueBand` is cheap; the
TradeTicket's existing cheap/fair/rich tag is unified onto the same `valueBand` helper; suite +
e2e green.

## Why this brick
Prices in this sim anchor in `[baseCost..consumeValue]` (the producer-floor / consumer-ceiling band),
so "where in its band is this trading?" is a real value-investing signal — buy cheap (near floor),
sell rich (near ceiling) — orthogonal to the flip-margin (spread) and movers (EMA) lenses. The ticket
shows it for ONE selected item (cheap/fair/rich); a market-wide filter surfaces the whole accumulation
shortlist. Fresh subsystem (market core) after a raid-records run. Verified novel: MarketTable tracks
are `all/staples/exotics/gear/flippable` — no value-band track.

## Design — extract one helper, unify the ticket, add the track
- `valueBand(def, lastPrice)` (game.ts, pure) → `'cheap' | 'fair' | 'rich' | null` (null when no band):
  position = clamp01((last − baseCost)/(consumeValue − baseCost)); <0.34 cheap, <0.67 fair, else rich.
  This is the TradeTicket's exact inline logic, extracted — the ticket now CALLS it (single source, so
  the per-item tag and the market filter can never disagree).
- MarketTable: a `'cheap'` track whose predicate is `valueBand(def, m.lastPrice) === 'cheap'`; `inTrack`
  widened to read `lastPrice`; the track button added to the existing toggle row.

## Scope (in)
- `game.ts`: `valueBand` helper
- `TradeTicket.tsx`: replace the inline band/valuePos/valueLabel with `valueBand(def, lastPrice)`
- `MarketTable.tsx`: `'cheap'` track + predicate + button
- `app.test.tsx`: `valueBand` unit (cheap/fair/rich/clamp/null) + a MarketTable "cheap" filter render

## Scope (out)
- No value-band COLUMN or per-row marker (one filter track, not 128 rows of noise); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `valueBand`: cheap(0.1)/fair(0.5)/rich(0.9), clamps out-of-band (50→cheap, 999→rich), null when consumeValue ≤ baseCost
- [x] MarketTable "cheap" track shows only cheap-band items (rich filtered); ticket value tag unchanged (full suite green)
- [x] UI suite (330, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Threshold reuses the ticket's 0.34/0.67 (now literally the same code) — tuning them moves both at once.
