# Phase: Exchange Wars — Phase 2c: Idle Automation Tiers

**Started:** 2026-06-10
**Hat:** Builder
**Goal:** Purchasable engine-side automation: an `idle` player who buys autoFlip tiers earns gp hands-free inside the tick loop — so automation works identically during offline fast-forward. This separates "active player" (commands between ticks; the scripted flipper models this) from "idle player" (engine automation).
**Done condition:** `buyUpgrade` command burns gp through the ledger with a tier schedule; an idle-policy player with autoFlip tier 1 ends a 6,000-tick default-world run with net worth above start, hands-free; a tier-0 idle player provably does nothing; all existing gates stay green.

## Scope (in)
- `AgentState.policy` ('scripted-flipper' default | 'idle') + `AgentState.upgrades` (tier map), both plain-JSON
- `buyUpgrade` command (PROGRESSION.upgrades.autoFlip: 3 tiers, 50k/150k/400k, burned)
- Refactor: extract `runFlipper(state, agent, opts)` strategy core; scripted player and automation tiers both call it with different caps (tier caps in TUNING.automation)
- Player dispatch: scripted cadence 5; idle automation uses per-tier cadence (10/8/6)
- playerView exposes `upgrades`
- test/automation.test.ts: upgrade purchase paths, tier-0 inertness, tier-1 hands-free profitability in the default world, maxFlips cap

## Scope (out)
- auto-relist as a separate upgrade (autoFlip subsumes it for now), auto-buySlot
- UI/server, additional NPC work, workspace/CI split

## Subsystems touched
- src/engine/types.ts, commands.ts, agents.ts (dispatch + extraction), test/automation.test.ts (new)

## Gates
- [x] Automation unit gate — green (automation.test.ts, 7 tests incl. tier-2 cap, round-trip, prototype-key rejection)
- [x] Idle-profit gate — tier-1 idle profits hands-free over 6k ticks WHILE competing with the scripted flipper (+227); tier 2 +1,769; tier 3 +518 (non-monotonic → FINDINGS #15, balance pass queued)
- [x] All existing gates green — 62 tests
- [x] Adversarial review — verdict SOUND; refactor fidelity confirmed byte-equivalent; 1 real crash bug fixed (`__proto__` upgradeId → uncaught TypeError, now Object.hasOwn-guarded); 4 test gaps closed

**Closed:** 2026-06-10 — done condition met.

## Open questions
- Tier cost/cadence balance (draft: 50k/150k/400k, cadence 10/8/6, flips 1/2/2, qty 4/6/8)
- Should idle automation ever buy slots/upgrades on its own? (current answer: no — purchases are deliberate)
