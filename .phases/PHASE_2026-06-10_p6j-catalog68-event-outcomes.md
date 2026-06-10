# Phase: Exchange Wars — Phase 6j: Catalog 68 & Event Outcomes

**Started:** 2026-06-10
**Hat:** Builder (content + UI polish)
**Goal:** Bump the wiki catalog 64→68 items (48 staples + 20 exotics); Chronicle logs event *outcomes* (price move over the event's life) when events end.
**Done condition:** catalog regenerated, all gates green (sweep if balance red per FINDINGS #25/#32), event-end entries render in the Chronicle, CI green, live bundle flipped.

## Scope (in)
- `npm run gen:catalog -- --staples 48 --exotics 20`
- Routine tier sweep if the balance gate goes red after the re-roll
- `game.ts` updateNews: detect event end, log outcome line (price at start vs end)
- Unit test for the outcome entry

## Scope (out — explicit non-goals)
- New event types, tier-3 "trades events" clerk perk (still queued — needs exit strategy)
- Leaderboards (blocked on Supabase finisher)

## Subsystems touched
- packages/engine/src/catalog.ts (GENERATED)
- packages/engine/src/agents.ts (TUNING, only if sweep demands)
- packages/ui/src/game.ts, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 105-unit suite + 6 e2e green (2 new outcome tests)
- [x] Balance gate green — two-leg sweep → tier 2 cadence 8 / vol 0.12 (FINDINGS #34)
- [ ] CI green + live bundle verified (checked post-push)

## Outcome notes
- FINDINGS #33: tier-3 exotic money printer discovered (+140k–195k/8k ticks), pre-existing; queued as Phase 6k with a gate magnitude ceiling.
