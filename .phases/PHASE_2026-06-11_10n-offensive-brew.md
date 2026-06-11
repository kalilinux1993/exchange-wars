# Phase: Exchange Wars — Phase 10n: The Offensive Brew (Brick 66)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (complete the brew pair — a real pre-dive tactical choice)
**Goal:** Goading potion → +10 atk for the dive, the offensive counterpart to divine bastion's +10 def. Existing dive-long-flag machinery; real catalog item.
**Done condition:** CONSUMABLES entry + test (refresh bastion→goading); fn redeployed (replay-affecting). **MET.**

## Outcome
- quest.ts CONSUMABLES.goading_potion_4 {heal:0, boostAtk:10}. Pre-dive choice: offence (faster kills, less leech) vs defence (deeper survival).
- Fixture-ripple fixes (FINDINGS #100): combat-brew "persists" assertion → goading; Death Ward total-units 12→13 (unpacked goading = +1 home stock).
- 204/204 unit; 9/9 e2e; verify-score rebuilt (87.3kb) + redeployed. FINDINGS #100.

## Gates
- [x] Goading sets +atk boost, refreshes off bastion (test)
- [x] Fixture-coupled tests swept (combat-brew persists, death-ward count)
- [x] Suite + e2e; fn redeploy
