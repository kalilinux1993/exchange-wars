# Phase: Exchange Wars — Phase 1: Headless Economy Engine

**Started:** 2026-06-10
**Hat:** Builder (greenfield bootstrap; architecture per greenfield-architect design doc)
**Goal:** Stand up the Exchange Wars repo and build a fully deterministic, headless economy engine that Claude can test, debug, and balance without human input.
**Done condition:** `npm test` green with all four gates passing (unit, determinism incl. snapshot/restore, conservation ledger, market sanity across 3 seeds), and `npm run sim -- --seed 42 --ticks 10000` completes with a sane economy report.

## Scope (in)
- Repo bootstrap (git, TypeScript strict, vitest, tsx) at Dev/Fullauto
- Seeded RNG (mulberry32, state stored in world state — no Math.random/Date.now in engine)
- GE-style limit order book: price-time priority, partial fills, gp/item escrow, 2% sell tax (gp sink)
- Mint/burn ledger for conservation accounting
- NPC archetypes: producer, consumer, market maker, momentum, noise
- Scripted player flipper bot (proves programmatic playability day one)
- CLI sim runner + economy report
- Test suites: unit / determinism / conservation / market-sanity

## Scope (out — explicit non-goals)
- Any UI (Phase 3+), server/leaderboards, persistence beyond JSON snapshot
- Player progression/unlocks (Phase 2)
- Balancing beyond "anchored and non-degenerate"
- CI pipeline, publishing (later phase)

## Subsystems touched
- src/engine/* (new), src/cli/run.ts (new), test/* (new)

## Gates
- [x] Unit gate: order book matching + escrow + tax exactness — green (exchange.test.ts, 10 tests)
- [x] Determinism gate: same seed → same hash; JSON snapshot/restore mid-run → identical continuation — green
- [x] Conservation gate: gp & item ledgers balance after 4000+ ticks (invariant checker) — green, 6 seeds
- [x] Market sanity gate: prices anchored, volume flows, **tightened to: flipper ends profitable** — green on seeds 11/42/1337
- [x] Spam-test on tick loop — passed; 2 minor findings (book soft-bound, trades shift cost) logged to NEXT_STEPS
- [x] Adversarial review — verdict SOUND, 0 critical/major; hardening applied (agentById assert, 2 regression tests)

**Closed:** 2026-06-10 — done condition met.

## Open questions
- Final wage/production-rate balance numbers (tune from first sim reports)
- Whether momentum traders cause runaway booms on some seeds (watch market gate)
