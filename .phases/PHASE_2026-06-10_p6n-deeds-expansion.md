# Phase: Exchange Wars — Phase 6n: Deeds Expansion

**Started:** 2026-06-10
**Hat:** Builder (content/progression)
**Goal:** Four new Deeds built on existing tracked data: Gold Baron (5M worth), Exotic Taste (hold an exotic), Quartermaster General (10 contracts), Storm Trader (fill during an active event).
**Done condition:** deeds render with progress where meaningful, latch correctly (unit-tested each), all gates green, CI + live.

## Scope (in)
- MILESTONES additions in packages/ui/src/game.ts (no engine changes)
- Unit tests per deed in app.test.tsx

## Scope (out — explicit non-goals)
- Deeds needing new engine tracking (e.g. per-item profit attribution); prestige

## Subsystems touched
- packages/ui/src/game.ts, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 109 unit + 6 e2e green
- [ ] CI green + live bundle verified (checked post-push)

## Notes
- Storm Trader matches fills (≤50, persisted) against world.events windows. Events prune every 250 ticks, but only live play can produce event fills (clerks refuse event items), and checkMilestones runs every refresh — reliable in practice.
