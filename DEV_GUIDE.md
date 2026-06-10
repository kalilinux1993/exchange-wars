# Dev Guide

## Phase 2 — Player Command Protocol + Progression (2026-06-10)

- **Command protocol** — `src/engine/commands.ts`: `applyCommand(state, playerId, cmd)` handles `place` / `cancel` / `buySlot`; `playerView(state, playerId)` returns the plain-JSON player snapshot (gp, slots, inventory copy, open orders, per-item `MarketView` with `bestBidIsMine`/`bestAskIsMine` ownership flags, null-never-undefined). This is the ONLY surface players (bots/UI/server) may use.
- **Slot progression** — `PROGRESSION` in commands.ts: players start with 3 offer slots, max 8; `buySlot` costs 25k/75k/200k/500k/1.25M and **burns** the gp via `ledger.gpBurned` (player-driven sink). Submitting an offer requires a free slot even if it would fill instantly (GE model). `AgentState.slots` (types.ts) is player-only, set in `addAgent` (sim.ts).
- **Flipper rewired** — `actPlayer` in src/engine/agents.ts drives the engine exclusively through the protocol; slot-aware (cancels a listing only when re-listing is guaranteed a slot; skips new flips when full; buys the next slot when gp > 4× its cost).
- **Long-run gate** — `test/longrun.test.ts`: 50k ticks conserved/anchored/profitable + offline-accrual proof (25k + snapshot-resume + 25k ≡ straight 50k, hash-equal). 100k-tick CLI run: 431ms, invariants OK.
- **Tests** — `test/commands.test.ts`: 13 tests (slot enforcement incl. partial-fill rest, unlock schedule + ledger burn, WorldState round-trip with upgraded slots, rejections, view flags, command-driven conservation).

## Phase 1 — Headless Economy Engine (2026-06-10)

Built the complete deterministic sim core. Everything below is new in this phase.

### What exists and where
- **RNG** — `src/engine/rng.ts`: mulberry32 behind the `RNG` interface; `state()` exposes the 32-bit cursor stored in `WorldState.rngState`, so `createRng(savedState)` resumes the stream exactly. `fnv1a` lives here too.
- **World state** — `src/engine/types.ts`: plain-JSON-only shapes. The doc comment at the top of the file is the contract.
- **Order book / matching** — `src/engine/exchange.ts`: `placeOrder` (validate → match against opposing side at resting price → rest remainder), `cancelAgentOrders` (item/side filterable), `createBook`, `bestBid`/`bestAsk`. Escrow rules: buy remainders lock `price*remaining` gp; sells lock items up front; fills debit the incoming buyer at trade price. `paySeller` burns the 2% tax (`GE_TAX_RATE`). Self-trades are skipped in the match loop, never filled.
- **NPC + player bots** — `src/engine/agents.ts`: `actAgent` dispatcher with per-kind cadence; archetypes `actProducer` (cost floor), `actConsumer` (wage faucet, item burn, value ceiling), `actMarketMaker` (EMA-centred quotes), `actMomentum`, `actNoise`, and `actPlayer` — the scripted flipper (buy bid+1 / sell ask−1, 3% min-margin entry filter). **All balance constants live in `TUNING`.**
- **Sim loop** — `src/engine/sim.ts`: `createWorld(config)`, `addAgent` (also the test-fixture entry point — keeps ledger initial totals honest), `tickWorld`, `runTicks`.
- **Conservation checker** — `src/engine/invariants.ts`: `checkInvariants` re-derives gp/item totals from the world and compares against the ledger; also asserts escrow exactness, book sort order, safe integers.
- **Hash / report** — `src/engine/hash.ts` (`hashState` = FNV-1a over key-sorted JSON), `src/engine/report.ts` (`renderReport`, `netWorth`, `wealthByKind`).
- **CLI** — `src/cli/run.ts`: `npm run sim -- --seed N --ticks N [--report-every N]`.

### Test gates (test/)
| File | Gate |
|------|------|
| `exchange.test.ts` | matching, escrow, tax, priority, self-trade skip, cancel refunds |
| `determinism.test.ts` | seed→hash equality; JSON snapshot/restore resumes identically |
| `conservation.test.ts` | ledger balance through 4000 ticks + seed spread |
| `market.test.ts` | 3 seeds × 6000 ticks: prices anchored, volume flows, **flipper profits** |
| `purity.test.ts` | greps `src/engine` for wall-clock/randomness APIs (comments stripped) |
| `rng.test.ts` | determinism, bounds, resume-from-state, uniformity |

### Phase-1 verification numbers (seed 42)
10k ticks ≈ 103 ms; prices settle just above producer cost (e.g. iron_ore 84 vs cost 80); ~35.5k trades; 0 rejected orders; flipper +2,234 gp from 50k start.
