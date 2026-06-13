# Phase: Exchange Wars — Phase 17r: A "compact" market-columns toggle (Brick 252)

**Started:** 2026-06-12
**Hat:** Builder (UX — declutter the dense table I flagged in the visual pass)
**Goal:** A "compact" toggle on the MarketTable that hides the five analysis columns (mom/margin/band/swing +
the trend sparkline), leaving a clean item/bid/ask/last/volume price view. Persisted. The honest follow-through
on the #278 finding (the 10-column table is dense, though it scrolls).
**Done condition:** Toggling "compact" hides the analysis columns (item/bid/ask/last/volume remain); the
state persists; suite + e2e green.

## Why this brick
The visual assessment (#278) found the market table dense — 10 columns (4 decision lenses + a sparkline added
this session). It WORKS (`.market` has `overflow: auto`, so it scrolls), so this isn't a fix; it's giving the
player a choice: a flipper who trades on price/spread can hide the analysis columns for a cleaner read, and
re-show them when analysing. Routing the post-assessment effort INTO the surface I flagged (vs adding more to
it) is the right response to my own finding.

## Design — a class toggle + CSS nth-child hide (verified by e2e)
- `MarketTable.tsx`: `usePref<boolean>('ew-market-compact', false)`; the section className gains `compact`
  when on; a "compact" toggle chip (active-styled like a track chip) by the filter row.
- `styles.css`: `.market.compact` hides `thead th` / `tbody td` `:nth-child(5..9)` — the column positions of
  mom(5)/margin(6)/band(7)/trend(8)/swing(9); item/bid/ask/last(1–4) + volume(10) stay. Commented with the
  column map (nth-child is position-fragile — the e2e guards it).
- `e2e/game.spec.ts`: toggle compact, assert the `mom` header is hidden (real-browser `display:none`), so the
  nth-child indices are verified where jsdom can't.

## Scope (in)
- `MarketTable.tsx`: compact pref + toggle chip + section class
- `styles.css`: `.market.compact` column-hide rule
- `app.test.tsx`: the toggle applies/removes `.compact` and persists
- `e2e/game.spec.ts`: compact hides a decision column (column-index correctness)

## Scope (out)
- No per-column show/hide (one compact preset); no JSX column removal (CSS keeps the markup stable); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx
- packages/ui/e2e/game.spec.ts

## Gates
- [x] toggle adds/removes `.compact` on `.market` + persists via usePref('ew-market-compact'); unit asserts class + persistence
- [x] e2e: compact hides mom + margin, keeps bid + volume — nth-child indices verified in a real browser
- [x] UI suite (416, +1) + e2e (10, +1) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — CSS column-hide is a standard pattern; the e2e covers the one risk (column positions).
