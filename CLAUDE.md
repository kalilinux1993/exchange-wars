# Exchange Wars — Project Instructions

## What this is
Deterministic headless market-sim game (TypeScript, vitest, tsx). See README.md for architecture, PHASE_CURRENT.md for the active phase, NEXT_STEPS.md for the queue.

## Hard constraints (violating any of these is a bug, full stop)
1. **Engine purity:** nothing in `packages/engine/src/` may touch the wall clock, `Math.random`, timers, env, filesystem, or network. `packages/engine/test/purity.test.ts` enforces by grep; don't weaken it.
2. **Determinism:** all randomness via `createRng`; the cursor lives in `WorldState.rngState`. Same seed + same tick count must produce an identical `hashState()` forever.
3. **Plain-JSON state:** `WorldState` holds no classes/functions/Map/Set/undefined. Snapshot = `JSON.parse(JSON.stringify(state))` and must resume identically.
4. **Conservation:** gp/items enter or leave the world ONLY via `state.ledger` mint/burn fields. Any new mechanic that creates or destroys value must book it there, or `checkInvariants` will (correctly) blow up.
5. **Integer gp:** prices and balances are integers; tax is `Math.floor`. No float gp anywhere.
6. **Iteration order:** iterate items via `state.items`, agents via `state.agents` array order, Record keys only after `.sort()`.

## UI/bot access rule
Reading `WorldState` for display (sparklines from `state.trades`, report rendering) is fine. **Mutations go through `applyCommand` only** — no UI or bot may call `placeOrder`/`cancelAgentOrders`/ledger fields directly on behalf of a player.

## Workflow
- Run `npm run typecheck` and `npm test` before declaring anything done. The market-sanity gate is deterministic per seed — if you change agent behavior or TUNING, re-run sims on seeds 11/42/1337 and re-tune before blaming the test.
- Balance numbers live ONLY in `TUNING` (packages/engine/src/agents.ts). Tuning passes touch that object, nothing else.
- Verify economy changes by running `npm run sim -- --seed 42 --ticks 10000` and reading the report (prices anchored in [cost..value], flipper profitable, 0 rejected orders, invariants OK).
- Phase rituals: /start-phase and /end-phase; gates listed in PHASE_CURRENT.md.
