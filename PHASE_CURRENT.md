# Phase: Exchange Wars — Phase 2: Player Command Protocol + Progression

**Started:** 2026-06-10
**Hat:** Builder (feature work on the established Phase 1 architecture)
**Goal:** Make the player a first-class, protocol-driven citizen: a serializable command API as the ONLY player surface, GE-slot-style offer limits with purchasable unlocks (a real gp sink), and offline accrual via fast-forward.
**Done condition:** `npm test` green including a new command-protocol suite; the flipper bot drives the engine exclusively through `applyCommand`/`playerView` (zero direct engine calls) and stays profitable on seeds 11/42/1337; slot unlocks burn gp through the ledger; all Phase 1 gates untouched and green.

## Scope (in)
- `src/engine/commands.ts`: `PlayerCommand` union (place / cancel / buySlot), `applyCommand(state, playerId, cmd) → CommandResult`, `playerView(state, playerId) → PlayerView` (plain-JSON, null-not-undefined)
- Offer slots: players start with 3, max 8; `buySlot` burns gp per a rising cost schedule (`PROGRESSION`)
- Rewire `actPlayer` flipper to use ONLY the command protocol (slot-aware: sells first, buy if a slot is free)
- Offline accrual: verified as fast-forward (long-run invariant + wall-time check)
- Tests: slot enforcement, unlock purchase + ledger burn, rejection paths, view correctness + JSON round-trip, command-driven conservation

## Scope (out — explicit non-goals)
- UI, server, persistence to disk
- Smarter flipper strategy beyond the protocol rewiring
- Multiple concurrent players' balance (engine allows it; tuning later)
- Automation tiers beyond slots (auto-flip unlocks come later in Phase 2 continuation)

## Subsystems touched
- src/engine/commands.ts (new), src/engine/types.ts (AgentState.slots), src/engine/sim.ts (player init), src/engine/agents.ts (actPlayer rewrite), test/commands.test.ts (new), test/market.test.ts (unchanged but must stay green)

## Gates
- [ ] Command-protocol unit gate (slots, rejections, ledger burn, view round-trip)
- [ ] All Phase 1 gates stay green (determinism, conservation, market incl. flipper profit, purity)
- [ ] Spam-test if applyCommand changes hot-path behavior materially
- [ ] Adversarial review at phase end (via /end-phase)

## Open questions
- Slot cost schedule tuning (current draft: 25k/75k/200k/500k/1.25M for slots 4→8)
- Does the 3-slot cap hurt the baseline flipper's profitability? (market gate will tell)
