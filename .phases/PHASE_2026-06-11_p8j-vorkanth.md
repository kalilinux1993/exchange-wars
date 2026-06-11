# Phase: Exchange Wars — Phase 8j: Vorkanth, Elder of the Maw (Brick 10)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc — the named elite)
**Goal:** 10% of monster encounters in The Dragon's Maw are VORKANTH — a named elder dragon (180 hp, atk 30, dragonfire) with guaranteed superior bones and real chances at dragon platelegs/med helm. `MonsterDef.elite` + `stats.eliteSlain` + the Elder Slayer deed.
**Done condition:** elite spawns observed across seeds (Maw only), drops conserve, deed latches, gates green, fn redeployed, CI + live.

## Scope (in)
- quest.ts: vorkanth def (elite), ELITE_CHANCE, spawn in advance (Maw monster branch)
- stats.eliteSlain; deed 'elder-slayer'; tests

## Gates
- [ ] typecheck + unit + e2e green; fn redeployed
- [ ] CI green + live verified
