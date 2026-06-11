# Phase: Exchange Wars — Phase 8h: Hunter's Tally & the Ambush (Brick 8)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc)
**Goal:** The Expeditions picker shows your lifetime tally (slain · caches · dice won · deepest region). In the field, 8% of monster encounters are an AMBUSH — a beast from one region deeper crosses the path (its better gp/drops are the natural reward; the intro line names the danger).
**Done condition:** tally renders; ambush observed across seeds (deeper-region monster in plains combat); newCombat intro stays replay-compatible; gates green; fn redeployed; CI + live.

## Scope (in)
- quest.ts: AMBUSH_CHANCE + newCombat optional intro; commands advance monster branch
- ExpeditionPanel tally line; tests

## Gates
- [ ] typecheck + unit + e2e green; fn redeployed
- [ ] CI green + live verified
