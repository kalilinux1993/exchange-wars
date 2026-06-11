# Phase: Exchange Wars — Phase 10k: The Sellsword's Haul (Brick 63)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (make invisible idle work visible)
**Goal:** Attribute the Sellsword's own kills + banked loot so the idle-adventuring half is legible. Almanac line. Worth-neutral.
**Done condition:** counters + Almanac line + test; fn redeployed (engine bundle changed). **MET.**

## Outcome
- types SimStats: sellswordKills/sellswordBanked. actSellsword: slain-delta around its combat round → sellswordKills; exp.packGp before its finishExtract → sellswordBanked.
- AlmanacPanel: "🗡 sellsword haul: N kills · X gp" when nonzero.
- 202/202 unit (sellsword test now asserts both counters grow); 9/9 e2e; verify-score rebuilt (87.1kb) + redeployed (worth-neutral, bundle current). FINDINGS #97.

## Gates
- [x] Counters grow under autonomous sellsword (test)
- [x] Suite + e2e; fn redeploy
