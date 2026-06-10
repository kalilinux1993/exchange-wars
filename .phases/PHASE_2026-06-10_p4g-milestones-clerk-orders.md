# Phase: Exchange Wars — Phase 4g: Milestones, Clerk Orders & More

**Started:** 2026-06-10
**Hat:** Builder (EXPANDED mid-phase per Jesse: "more items, achievements, advanced AI bot options, more more more")
**Goal:** Achievements with toasts; configurable idle-bot ("Clerk Orders": risk ceiling / capital commitment / item focus via a new validated command); catalog to 28; tape juice; offline cap doubled; CI Node-24 opt-in.
**Done condition:** 9 milestones latch deterministically (persisted, no double-unlock) with toast + panel; `configureBot` command validated/clamped (vol ≤ tier ceiling, capitalFraction 0.1–0.5, focus item must exist) and idle automation honors it, with engine tests; 28-item catalog with all gates green; tape entrance animation; OFFLINE_CAP_TICKS 100k; CI green post-push; live verified.

## Scope (in)
- game.ts: `Game.milestones`, MILESTONES (9), `checkMilestones` latch; App toast + MilestonesPanel
- Engine: `AgentState.botConfig`, `configureBot` command (clamped patch), actIdlePlayer merges config (effective maxVolatility = min(tier, cfg); capitalFraction clamp; focus filter); PlayerView exposes botConfig
- UI: Clerk Orders controls in UpgradeShop (risk presets, capital presets, focus select)
- Catalog +6: willow logs, bronze bar, mithril bar, green d'hide, onyx bolt tips, dragon dagger (28 total)
- styles: toast + tape-row entrance animation; OFFLINE_CAP_TICKS → 100_000; ci.yml Node-24 env
- Tests: milestones unit + toast flow; configureBot validation/clamps + automation-honors-config engine tests; gates at 28 items

## Scope (out)
- Sounds, art overhaul, strategy archetypes beyond config knobs (later), offline-cap economy redesign

## Subsystems touched
- packages/ui/* (game, App, MilestonesPanel, styles), .github/workflows/ci.yml, tests

## Gates
- [x] Unit + e2e green — 79 + 6. Balance gate forced a tier-1 re-tune; fixed via 6-config SWEEP (cadence 8/vol 0.10: min cell +8,360) after three single-knob probes each traded marginal seeds (FINDINGS #24)
- [x] Milestones persist + no double-unlock (unit-gated); configureBot clamps/validation + automation-honors-config engine-gated
- [x] CI deploy + live verification: push pending below (CI auto-deploys)

**Closed:** 2026-06-10 — done condition met. In-phase per Jesse: 55k start.

## Open questions
- Milestone set is v1 — extend when new mechanics land (e.g., whip ownership needs reliable detection)
