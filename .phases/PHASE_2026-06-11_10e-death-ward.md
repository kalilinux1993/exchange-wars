# Phase: Exchange Wars — Phase 10e: The Death Ward (Brick 57)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (a progression sink that ties the market to raiding)
**Goal:** A 100k-gp upgrade that softens death — keep 5 most valuable carried units instead of 3. Deep gp sink + raider progression.
**Done condition:** upgrade + death-keep wiring + Hall button shipped with a conserved test; fn redeployed (replay-affecting). **MET.**

## Outcome
- PROGRESSION.upgrades.deathWard {costs:[100_000]} (buyUpgrade already generic); DEATH_KEEP_BASE/WARDED; expeditionDeath keepN from agent.upgrades.deathWard; UpgradeShop buy button.
- 200/200 unit (warded death → total inventory = 7 home + 5 kept = 12; conservation gate caught a direct agent.gp poke, fixed to burn the fixture's 100k); 9/9 e2e; verify-score rebuilt (86.5kb) + redeployed. Sellsword/grinder buy no upgrades → balance untouched. FINDINGS #91.

## Gates
- [x] Warded death keeps 5, conserved (total-units assertion)
- [x] Suite + e2e; fn redeploy (replay-affecting)
