# Phase: Exchange Wars — Phase 10d: The Strongbox Courier (Brick 56)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (content — an event face that bends RISK, the one system the other 7 don't)
**Goal:** A courier event (region 2+): ship COURIER_FRACTION (0.5) of loot gp to the safe purse for a COURIER_CUT (0.2) that burns. Partial de-risk — lock in winnings at a haircut vs carry-and-gamble. Conservation-exact.
**Done condition:** event + resolution + UI + e2e shipped with a conserved test; fn redeployed (replay-affecting). **MET.**

## Outcome
- quest.ts: EventState 'courier'; COURIER_FRACTION/COURIER_CUT. commands.ts: spawn (rIdx≥2) + prompt + resolve (packGp→agent.gp minus burned cut). UI accept label 'ship it home'; e2e regex widened.
- agent.gp is death-safe (expeditionDeath burns only packGp) — so shipped loot genuinely survives death.
- 199/199 unit (ships 500, cut 100, banks 400, conserved); 9/9 e2e; verify-score rebuilt (86.2kb) + redeployed. Sellsword declines events → balance untouched. FINDINGS #90.

## Gates
- [x] Courier banks half-minus-cut, conserved (test)
- [x] Suite + e2e; fn redeploy (replay-affecting)
