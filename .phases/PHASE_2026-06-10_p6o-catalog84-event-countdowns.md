# Phase: Exchange Wars — Phase 6o: Catalog 84 & Event Countdowns

**Started:** 2026-06-10
**Hat:** Builder (content + trader UX)
**Goal:** Catalog 76→84 (56 staples + 28 exotics) — second data point for FINDINGS #37 (sweep-free regens); event chips + ticket show how long an active event has left.
**Done condition:** catalog regenerated; countdown renders (chip tooltip + ticket line); balance timeout raised for the bigger suite; all gates green (two-leg sweep if red); CI + live.

## Scope (in)
- `npm run gen:catalog -- --staples 56 --exotics 28`
- Event "ends in ~N ticks" in MarketTable chip title + TradeTicket line for the selected item
- balance.test.ts per-it timeout 240s → 360s (suite grows with catalog; CI headroom)
- Unit test for countdown rendering

## Scope (out)
- New event mechanics; Jesse-gated arcs

## Subsystems touched
- packages/engine/src/catalog.ts (GENERATED), packages/ui/src/components/{MarketTable,TradeTicket}.tsx
- packages/engine/test/balance.test.ts (timeout only)

## Gates
- [x] typecheck + 110 unit + 6 e2e green — regen broke tiers 1-2; two-leg re-sweeps locked t1 cad7/v0.10, t2 cad7/v0.12; t3 re-verified (FINDINGS #38, #37 refuted)
- [ ] CI green + live bundle verified (checked post-push)
