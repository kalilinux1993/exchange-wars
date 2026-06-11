# Phase: Exchange Wars — Phase 7a: Market Navigation at 120 Items

**Started:** 2026-06-10
**Hat:** Builder (UI navigation)
**Goal:** 120 rows need better wayfinding: staples/exotics track chips beside the filter, and a ⚡ marker on rows with an active event (the newsbar names them, but finding the row was a scroll hunt).
**Done condition:** track chips filter (composing with the text filter + sort), ⚡ row markers render for active events only, unit-tested, gates green, CI + live.

## Scope (in)
- MarketTable: `track` chip state (all/staples/exotics; exotic = vol ≥ 0.13), `eventItems` prop + ⚡ name-cell marker
- App: pass active-event item set
- Unit tests: track filter counts; event marker presence/absence

## Scope (out)
- Price-band filters; pinned/favorite rows

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx, packages/ui/src/App.tsx, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 123 unit + 7 e2e green
- [ ] CI green + live bundle verified (checked post-push)
