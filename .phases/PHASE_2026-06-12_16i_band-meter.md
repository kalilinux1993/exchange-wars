# Phase: Exchange Wars — Phase 16i: Band Meter (visualize the cost→value range) (Brick 217)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — make the core trading concept tangible)
**Goal:** A horizontal meter on the ticket showing where the last price sits between an item's producer
floor (`baseCost`) and consumer ceiling (`consumeValue`), with the floor/ceiling VALUES labelled — the
visual complement to the cheap/fair/rich tag, surfacing the concrete band bounds the category hides.
**Done condition:** The ticket shows a floor─[marker]─ceiling meter for a banded item (marker at the exact
band position, zone-coloured track); nothing for a bandless item; suite + e2e green.

## Why this brick
The value-band is the game's central trading concept (9 lenses built on it), but every surface so far shows
only the CATEGORY (🟢/⚪/🟡) — none shows the concrete BOUNDS. "Rich" doesn't tell you the price trades
100–200 and you're at 180 (only 20 of upside left); the floor/ceiling values + the exact position are
genuine decision info the category can't give, and a small visual meter is the natural way to show "how
much room is left". A real feature (new info: the band's actual range), not just polish — and the kind of
make-the-abstract-tangible visual the frontend-design discipline calls for.

## Design — a small reusable component + CSS
- `components/BandMeter.tsx`: `BandMeter({ def, lastPrice })` — `bandPosition(def, last)` for the marker
  position (null → render nothing), `valueBand` for the marker tint; a flex row "floor [track●] ceiling"
  where the track is a green(cheap third)→gray(fair)→gold(rich third) gradient and the marker sits at
  `pos*100%`. Reuses the 15q/15f helpers; pure display.
- `TradeTicket.tsx`: `{market && <BandMeter def={def} lastPrice={market.lastPrice} />}` after the flip line.
- `styles.css`: `.bandmeter`/`.bm-track`/`.bm-marker`/`.bm-end`.

## Scope (in)
- `components/BandMeter.tsx` (new) + `TradeTicket.tsx` placement + `styles.css`
- `app.test.tsx`: marker at the right % for a known price; floor/ceiling shown; null for a bandless item

## Scope (out)
- No band meter on other surfaces yet (ticket is the focused single-item surface; positions/watchlist
  already carry the tag — a later pass if it reads well); no engine change

## Subsystems touched
- packages/ui/src/components/BandMeter.tsx (new)
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] the meter marker sits at `bandPosition*100%` (80% at 180 in 100..200; 0% clamp below floor); floor/ceiling values shown
- [x] a bandless item (consumeValue ≤ baseCost) renders no meter
- [x] UI suite (366, +3) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `bandPosition`/`valueBand`; the meter is a thin visual over them.
