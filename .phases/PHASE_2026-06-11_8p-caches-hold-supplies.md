# Phase: Exchange Wars — Phase 8p: Caches Hold Supplies (Brick 16)

**Started:** 2026-06-11
**Hat:** Tuner (close FINDINGS #49 with the queued design fix; re-measure under honest marks)
**Goal:** Deep caches minted 15–19k gear at 25%/find, making flee-everything cache farming the optimal route. Design rule, not a rate nerf: caches hold SUPPLIES (runes, food, coin) at every tier — gear drops only from monsters; expensive exotics (prayer pot 48.8k, antifire 17.3k) explicitly excluded from pools.
**Done condition:** pools swapped; suite green; honest re-measure shows fighting out-earns sneaking; fn redeployed; FINDINGS verdict.

## Scope (in)
- CACHE_LOOT pools (quest.ts) + design-rule comment
- Honest re-measure via tools/audit-grind.ts → FINDINGS #50

## Scope (out)
- Bestiary scaling vs leveled fighters (next measurement decides)
- Cache gp-roll changes (only if caches measure as pointless)

## Outcome
- Pools swapped (supplies only; pricey exotics excluded by name). Flee-route dead on contact.
- New table: naked leveling-fighter on top (+4–7k); geared raiding UNDERWATER (gear spread toll ~20k + death burns; loot doesn't repay) — exact mandate handed to the bestiary brick (FINDINGS #50).
- 167/167; fn redeployed (71.6kb).

## Gates
- [x] Suite green (catalog-integrity covers new pool ids) — 167/167
- [x] Re-measure: flee-route no longer dominates; record strategy table — recorded in FINDINGS #50
- [x] fn rebuild + redeploy
