# Phase: Exchange Wars — Phase 15g: Market Mood / Breadth Read (Brick 189)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — market macro lens)
**Goal:** A one-line macro read of the WHOLE market — how many items are trading up vs down
(breadth) and how many sit cheap vs rich — so a trader can gauge the environment at a glance.
**Done condition:** The Grand Exchange shows a "📊 N↑ / M↓ · 🟢 cheap · 🟡 rich" mood line above
the table; suite + e2e green.

## Why this brick
Every market signal so far is PER-ITEM (movers show the top few leaders, value-band tags one
item). There's no MACRO read — "is the whole market rallying or selling off? is it broadly cheap
(accumulate) or rich (offload)?". Market breadth (advance/decline) is a classic macro signal; here
it frames the cheap/rich strategy at the environment level. Fresh KIND of feature (aggregate vs
per-item). Verified novel: no market-mood/breadth/overview exists (MoversPanel shows top individual
movers, not counts).

## Design — pure aggregate helper + one line
- `marketMood(markets, items)` (game.ts, pure) → `{ up, down, cheap, rich }`: `up`/`down` count
  TRADED items (volume > 0) by lastPrice vs EMA (breadth is only meaningful where trading set a
  price); `cheap`/`rich` count `valueBand` positions across all items (reuses 15f's helper).
- MarketTable: a compact "📊 {up}↑ / {down}↓ · 🟢 {cheap} cheap · 🟡 {rich} rich" line above the
  table — computed from the `view.markets` + `items` it already has (no new plumbing).

## Scope (in)
- `game.ts`: `marketMood` + `MarketMood`
- `MarketTable.tsx`: the mood line
- `app.test.tsx`: `marketMood` unit (breadth gated on volume; cheap/rich via valueBand) + a render

## Scope (out)
- No average %-move / no historical mood trend (counts are the legible macro read); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `marketMood`: up/down count only volume>0 items (the untraded one excluded); cheap/rich via `valueBand`; fair counts neither
- [x] MarketTable renders the mood line (1↑ / 1 cheap for one cheap traded item)
- [x] UI suite (332, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — pure aggregation over the market view, reusing `valueBand`.
