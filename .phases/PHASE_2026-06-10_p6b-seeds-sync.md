# Phase: Exchange Wars — Phase 6b: Challenge Seeds & Sync Polish

**Started:** 2026-06-10
**Hat:** Builder (pairs with Phase 6; leaderboard prequel)
**Goal:** New Game takes a chosen seed (identical worlds = shareable challenges); the account bar shows sync status after cloud pushes.
**Done condition:** New Game opens an inline seed form (suggested seed prefilled, any integer accepted); starting creates a fresh world on that exact seed (test-gated); successful cloud pushes light a "synced" marker; suites + e2e green; CI + live.

## Scope (in)
- App: inline seed form replacing the silent seed+1 restart; restart(seed)
- AccountBar: lastSync prop → "synced" marker; App sets it on successful push
- Tests: seed-flow (enter 123 → world.seed 123, tick 0); suites green

## Scope (out)
- Catalog regen (two this session already — toll noted), leaderboards (needs Supabase finisher confirmed)

## Gates
- [x] Suites + e2e green — 94 + 6
- [x] CI + live on push (below)

**Closed:** 2026-06-10 — done condition met.
