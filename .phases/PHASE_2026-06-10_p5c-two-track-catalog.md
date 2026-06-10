# Phase: Exchange Wars — Phase 5c: Two-Track Catalog

**Started:** 2026-06-10
**Hat:** Builder (FINDINGS #31 design lever)
**Goal:** Generator selects two tracks — 40 staples (top volume) + 12 exotics (price ≥ 20k, volatility 0.13) — restoring the top end of the price ladder and tier-3's exotic niche; market table gets a sticky header + scroll for 52 rows.
**Done condition:** 52-item two-track catalog generated; tier-3's volatility ceiling is meaningful again (exotics are tier-3-only: 0.13 > tier-2's 0.12 ceiling); all gates green (sweeps expected — bigger world AND restored exotics change tier dynamics); UI scrolls the market cleanly; CI green; live verified.

## Scope (in)
- genCatalog: staples track (40 by volume) + exotics track (12 by volume among price ≥ 20k), exotic volatility 0.13; regen
- Market table: max-height + sticky thead (CSS)
- Sweeps as needed; docs

## Scope (out)
- Buy-limit mechanic (still queued), new panels

## Gates
- [x] All gates green at 52 items (89 + 6) — regen toll: tier-2 −75gp near-miss, swept to cadence 7; tier speed ladder now 10/7/5
- [x] CI + live on push (below)

**Closed:** 2026-06-10 — done condition met. NEXT (per Jesse): login + cloud saves ("trade on the GE from anywhere") — Phase 6 design in NEXT_STEPS.
