# Phase: Exchange Wars — Phase 9v: Combat Brews (Brick 48)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (a real tactical mechanic, reusing the antifire dive-long-flag shape)
**Goal:** Combat potions that buff stats for the whole dive. divine_bastion_potion_4 (real catalog item, ~16k) → +10 def for the dive, drinkable at camp or mid-combat, refresh-not-stack, dies with the expedition.
**Done condition:** ConsumableDef boostAtk/Def + ExpeditionState.boost + eat wiring + combat-stat application + UI; tests; fn redeployed (replay-affecting). **MET.**

## Outcome
- quest.ts: ConsumableDef.boostAtk/boostDef; CONSUMABLES divine_bastion_potion_4 {heal:0,boostDef:10}; ExpeditionState.boost.
- commands.ts: camp + combat eat set exp.boost; runCombatRound adds boost to derived stats BEFORE resolveRound (kept out of deriveStats — that pure fn also feeds the gear-only UI).
- UI: field buff line + pack-builder brew label.
- 194/194 unit (brew sets boost, conserved, persists, refresh); 9/9 e2e; verify-score rebuilt (85.4kb) + redeployed (new command effect/state). Balance untouched (sellsword/grinder don't drink). FINDINGS #82.

## Gates
- [x] Brew buffs for the dive, conserved, refresh-not-stack (test)
- [x] Suite + e2e; fn redeploy (replay-affecting)
