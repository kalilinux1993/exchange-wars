# Phase: Exchange Wars — Phase 4i: Contracts & Catalog VI

**Started:** 2026-06-10
**Hat:** Builder (standing directive; queue top: goal-directed trading)
**Goal:** The Quartermaster's Board — seeded NPC delivery contracts at a premium (engine command + UI), a Royal Contractor milestone, catalog to 32.
**Done condition:** Contracts spawn deterministically (≤3 open, qty scaled to price tier, 15–35% premium over EMA at spawn, expire + prune), `fulfillContract` pays via ledger mint and burns delivered items (conservation-gated), board UI with deliver buttons, milestone latches; all suites + CI green; live verified. Old saves migrate.

## Scope (in)
- Engine: `Contract` type, `WorldState.contracts` + `nextContractId` (both migrated in tickWorld), spawner in tickWorld (TUNING.contracts), `fulfillContract` command (inventory-only delivery — escrowed items don't count), `stats.contractsFilled`, view exposure
- UI: ContractsBoard panel (payout, expiry countdown, deliver button gated on inventory), 'Royal Contractor' milestone
- Catalog +2: death rune (220/430), red chinchompa (1150/2250)
- Tests: fulfill happy path + ledger entries, rejections (unknown/expired/insufficient/escrowed-not-counted), spawner bounds + cap + prune, UI deliver flow

## Scope (out)
- Tier-3 "trades events" clerk perk — DEFERRED with reason: needs an event-end exit strategy or it re-imports event variance into the balance gate (queued)
- Contract types beyond buy-orders (sell-side contracts, chains), prestige, ghosts

## Subsystems touched
- engine types/sim/commands/agents(TUNING)/catalog; ui (ContractsBoard, App, game milestones); tests

## Gates
- [x] Engine contract tests + all prior gates green at 32 items — 87 unit. Balance gate tripped as predicted (contract spawner consumes tick RNG → every seed's world re-rolled, FINDINGS #29); routine sweep landed tier 1 at cadence 10 / vol 0.10 (min +3,933)
- [x] UI tests + e2e green (6) — incl. full deliver flow with milestone latch
- [x] CI + live verification on push (below)

**Closed:** 2026-06-10 — done condition met.
