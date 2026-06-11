# Phase: Exchange Wars — Phase 9e: The Abyss (Brick 31)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (8th region with a NEW resource to extort — not more fire)
**Goal:** The Abyss (region 7): abyssal leech mechanic — monsters drain loot gp (burned) every round a fight drags on, pricing slowness. No dragonfire (antifire means nothing in the dark). Monsters: abyssal_leech (40/round), abyssal_demon (80/round); elite Vessith, the Unraveler (hp 300, atk 40, leech 200) with the 121k dragon_plateskirt jackpot at 0.25. Abyss Walker deed.
**Done condition:** region + leech + elite shipped with tests; suite + e2e + audit; fn redeployed. **MET.**

## Outcome
- MonsterDef.leech + drain in the combat command (post-round, fighting-only, capped at packGp, booked as burn, narrated in the combat log).
- Region row + 3 monsters; free by architecture: unlock chain, Inferno→Abyss ambushes, portal reach, per-region elite, bestiary rows, cache pools.
- Deed: Abyss Walker (deepest ≥ 7). Harness: abyss monsters on flee lists; fire-cap logic narrowed to regions 5/6.
- 181/181 (drain seed-scan: burn booked coin-for-coin, capped); 9/9 e2e; audit band stable 26k–188k; fn redeployed (81.1kb). FINDINGS #65.

## Gates
- [x] Drain capped at packGp and booked as burn (tested coin-for-coin)
- [x] Suite + e2e + audit; fn redeploy
