# Phase: Exchange Wars — Phase 6e: Market Filter & Keyboard

**Started:** 2026-06-10
**Hat:** Builder (standing directive — navigability at 56 items)
**Goal:** Live market filter (name substring, shown/total count) and space-bar pause/play (ignoring typing contexts).
**Done condition:** filter narrows rows (test-gated); space toggles speed 0 ↔ last speed except in inputs/selects/buttons (test-gated); suites + e2e green; CI + live.

## Scope (in)
- MarketTable filter input + count; App window keydown handler (Space)
- jsdom tests for both

## Scope (out)
- Catalog regen, leaderboards (blocked), further panels

## Gates
- [x] Suites + e2e green — 99 + 6
- [x] CI + live on push (below)

**Closed:** 2026-06-10 — done condition met.
