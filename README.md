# Exchange Wars

A market/trading tycoon game built on a fully deterministic, headless economy simulation. NPC agents — producers, consumers, market makers, momentum chasers, noise traders — trade items on a GE-style exchange with limit order books, escrow, and a 2% sell tax. The player flips items, corners markets, and (in later phases) unlocks automation.

The defining constraint: **the entire game core is testable and debuggable with zero human in the loop.** Same seed → same world, bit for bit. A scripted flipper bot plays the game programmatically from day one.

## Quick start

```sh
npm install
npm test                                   # all gates: unit, determinism, conservation, market sanity, purity
npm run sim -- --seed 42 --ticks 10000     # fast-forward an economy, print the report
npm run sim -- --seed 42 --ticks 10000 --report-every 2000
```

## Architecture (Phase 1)

```
src/engine/        pure simulation — no I/O, no clock, no Math.random (enforced by test/purity.test.ts)
  rng.ts           mulberry32, RNG cursor stored in world state
  types.ts         plain-JSON world state (round-trips losslessly)
  exchange.ts      limit order book: price-time priority, partial fills, escrow, 2% tax burn, self-trade skip
  agents.ts        NPC archetypes + scripted flipper player-bot; all balance numbers in TUNING
  sim.ts           world creation + tick loop
  invariants.ts    conservation checker (gp/items vs explicit mint/burn ledger)
  hash.ts          canonical-JSON FNV-1a state hash
  report.ts        economy report / net-worth helpers
src/cli/run.ts     headless sim runner
test/              the gates — see PHASE_CURRENT.md
```

## Economy design

- **Price floor:** producers mint items at a cost anchor and never sell below cost×1.05.
- **Price ceiling:** consumers earn wages (gp faucet), burn items (item sink), and never bid above reservation value.
- **gp sink:** 2% tax on every sale, burned to the ledger. **Conservation is provable:** in-world gp == initial + minted − burned, always (see `checkInvariants`).
- **Liquidity:** market makers quote both sides around the EMA; momentum/noise traders create the dislocations the flipper profits from.

## Determinism rules (hard constraints)

1. No `Date.now` / `Math.random` / `performance.now` / `new Date` / timers in `src/engine` — gated by `test/purity.test.ts`.
2. All randomness from the seeded RNG whose cursor lives in `WorldState.rngState`.
3. World state is plain JSON: no classes, functions, Map/Set, or `undefined` properties. `JSON.parse(JSON.stringify(state))` must resume identically — gated by `test/determinism.test.ts`.
4. gp is integer-only; totals are `Number.isSafeInteger`-checked in invariants.
5. Iteration over Records follows `state.items` order or sorted keys — never raw insertion order.
