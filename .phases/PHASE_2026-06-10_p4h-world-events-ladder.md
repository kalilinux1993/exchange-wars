# Phase: Exchange Wars — Phase 4h: World Events, Depth Ladder & Catalog V
(EXPANDED mid-phase per Jesse: "more items more advanced game in general — brainstorm + implement")

**Started:** 2026-06-10
**Hat:** Builder (standing directive)
**Goal:** A real order-book ladder for the selected item (top-5 price levels per side, depth bars, spread row, own-order markers) and catalog to 30.
**Done condition:** Ladder renders live book levels (display-only world read), updates with the ticket's selected item, marks the player's orders; catalog 30 with all gates green (tier-1 sweep re-run if the balance gate trips); suites + CI green; live verified.

## Scope (in)
- BookLadder component (aggregate orders into price levels, depth-proportional bars, spread, ◆ mine markers); wired to the ticket's selected item
- Catalog +2: snape grass (300/650, vol 0.12), gold ore (350/700, vol 0.09)
- NEXT_STEPS: close the offline-cap/payback item with data (cap 100k vs paybacks 43k–90k — tier 1 pays back in ~half a cap; acceptable by design)
- Tests: ladder render + own-order marker (jsdom); e2e boot assert

## Scope (out)
- Per-item full price-history charts (needs engine history support — candidate for a later phase), save slots, art overhaul

## Subsystems touched
- packages/engine/src/catalog.ts (data), packages/ui (BookLadder, App, styles), tests

## Gates
- [x] All gates green at 30 items WITH world events live — 83 unit + 6 e2e. Events first crashed markets to 0.24×cost (slump death spiral) then bubbled to 6×value (shock momentum chase) — fixed structurally: MM bargain-hunter floor, NPC sanity band, news-averse clerk (FINDINGS #26/27). Balance gate recovered with ZERO tier re-tuning.
- [x] Ladder + events tests green
- [x] CI + live verification on push (below)

**Closed:** 2026-06-10 — done condition met (expanded scope delivered: world events, ladder, corner milestone, 30 items).
