# Phase: Exchange Wars — Phase 7d: Band Visibility & Big Leagues Deed

**Started:** 2026-06-10
**Hat:** Builder (ladder arc closer)
**Goal:** The ticket names the selected item's band (staple — all clerks / big staple — senior clerks / exotic — human-only) so the risk select's language is visible per item; a "Big Leagues" deed latches on your first fill in the 0.12 band.
**Done condition:** band line renders for all three bands; deed latches (unit-tested); gates green; CI + live.

## Scope (in)
- TradeTicket: band tag on the wiki-snapshot line (from def.volatility)
- MILESTONES: 'big-leagues' (fills × defs join, same pattern as storm-rider)
- Unit tests for both

## Scope (out)
- More chips/filters; engine changes

## Subsystems touched
- packages/ui/src/components/TradeTicket.tsx, packages/ui/src/game.ts, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 124 unit + 7 e2e green
- [ ] CI green + live bundle verified (checked post-push)
