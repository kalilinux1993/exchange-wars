# Phase: Exchange Wars — Phase 9h: The Sellsword (Brick 34)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (the queued BIG brick — the idle game's second half)
**Goal:** A 30k hireling upgrade + toggle (configureSellsword) that runs YOUR adventurer inside tickWorld: one conservative action per TUNING.sellsword.cadence (4) ticks — embark empty-handed at the deepest region it will actually fight in (≤4, never fire country), fight timid monsters, flee elites/fire/leech/atk≥11, decline all events, extract at 3 clears or low hp, rest to 35 via regen. Levels YOUR stats, trickles loot, works offline (engine-side per FINDINGS #14).
**Done condition:** refactor + autopilot + command + UI shipped; old suite green UNCHANGED (equivalence proof); autonomy test (hunts/trains/never-fire/bit-identical twins/freezes when recalled); fn redeployed. **MET.**

## Outcome
- Refactor: rollEncounter / runCombatRound / beginExpedition / finishExtract extracted from command cases (identical draw order); commands = validate → tickWorld → helper; the 182 pre-existing tests passed unchanged = behavioral equivalence proven.
- actSellsword in commands.ts, called from tickWorld for flagged players; TUNING.sellsword (cadence 4, maxRegion 4, embarkHp 35, retreatHp 12, fleeAtk 11); PROGRESSION.upgrades.sellsword [30k].
- Policy lesson: a region CAP is not a TARGET — first draft fled everything at region 4; now hunts the deepest region with a fightable pool.
- UI: hire in Clerk's Counter, send-out/call-back toggle in Adventure; frozen afield when recalled (your expedition, your call).
- 183/183 unit; 9/9 e2e; fn redeployed (84.9kb). FINDINGS #68.

## Gates
- [x] Old suite unchanged (refactor equivalence)
- [x] Autonomy: hunts, trains, never enters fire country, twin worlds bit-identical, freezes on recall
- [x] No-op without upgrade+toggle (sims/gates byte-identical)
- [x] Suite + e2e; fn redeploy
