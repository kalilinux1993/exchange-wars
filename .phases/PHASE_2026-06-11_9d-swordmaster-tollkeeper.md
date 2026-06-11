# Phase: Exchange Wars — Phase 9d: The Swordmaster and the Toll-Keeper (Brick 30)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (two event faces, each bending a DIFFERENT system — FINDINGS #64)
**Goal:** SPAR (region 1+): the first non-combat xp source — +25 ⚔/🛡 and +9 ♥ for bruises that floor at 1 hp; level-up journal lines fire as in combat. TOLL (region 2+): 150 gp burned for a guaranteed cache roll (gp + 25% item from the depth pool) — converts coin into a chance at goods; paupers get waved off as a no-op.
**Done condition:** both events shipped engine+UI with conservation tests; e2e text net widened; suite + e2e green; fn redeployed. **MET.**

## Outcome
- EventState kinds + SPAR_XP/SPAR_BRUISES/TOLL_COST; pool gating (spar ≥1, toll ≥2); two resolver branches; UI accept labels ('take the lesson' / 'pay the toll').
- Tests: spar at 3 hp floors at 1 and lands exact xp; toll books a cacheFind and pays back; pauper toll books nothing; both worlds conserved.
- The event pool now bends seven different systems (healing, coin gamble, blood gamble, depth, supplies, training, coin→items).
- 180/180 unit; 9/9 e2e; fn redeployed (79.7kb).

## Gates
- [x] Spar can never kill (floor tested at 3 hp)
- [x] Both branches of both events conserved
- [x] Suite + e2e green; fn redeploy
