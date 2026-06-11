# Phase: Exchange Wars — Phase 8a: Combat Core (Expeditions Arc, Brick 1)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc — Jesse picked option 1: Expeditions on the live market)
**Goal:** The headless, deterministic combat core: gear/consumable tables over REAL catalog items (best-per-slot stat derivation), a tiered bestiary with loot tables (drops are real item ids — they'll mint into the live economy in 8b+), and a turn resolver (fight/flee/eat) driven by the RNG interface. No UI, no world integration yet — pure functions, gated like the exchange was in Phase 1.

**Design decisions (delegated by Jesse, locked):**
- Turn-based menu combat, one round per command → replayable runs → verified hardcore boards + ghosts later, free.
- Death keeps your 3 most valuable carried items; the rest burns (ledger) — OSRS rules, real stakes, feeds gear demand.
- Map = abstract node graph in the terminal aesthetic (8b); drawn map awaits art direction.
- Per-expedition RNG stream (seeded from world seed + expedition counter): adventuring NEVER re-rolls the market; existing gates untouched.

**Done condition:** quest module green under its own test gate (determinism, stat derivation, combat math, loot rolls, antifire special), purity gate passes, all suites green, CI + live.

## Scope (in)
- packages/engine/src/quest.ts: GEAR/CONSUMABLES (curated catalog ids), MONSTERS bestiary, deriveStats, newCombat, resolveRound
- Barrel export; packages/engine/test/quest.test.ts

## Scope (out — later bricks)
- 8b: expedition state machine + map + applyCommand integration (+ledger mint/burn)
- 8c: Expedition UI panel; 8d: deeds/guide/leaderboard tie-ins

## Gates
- [x] quest.test.ts green (8 tests: catalog integrity, determinism, math, loot, antifire, flee); purity gate passes
- [x] typecheck + 143 unit + 7 e2e green
- [ ] CI green + live verified (checked post-push)
