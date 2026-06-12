# Phase: Exchange Wars — Phase 11g: Skarn, the first elite (Brick 85) — BATCHED into PR #1

**Started:** 2026-06-11
**Closed:** 2026-06-11 (on branch feat/forge-event — NOT merged)
**Hat:** Builder (RPG content — a mid-game boss/jackpot)
**Goal:** Give the shallow regions their first named elite — Skarn, the Ruin-Walker — stalking the Wilderness Ruins, so mid-game raiders get a jackpot before the deep three.
**Done condition:** new elite spawns/resolves with elite credit + conserved drops, balanced for tier; full gate green; `engine.js` rebuilt. **MET (branch).**

## Why batched into PR #1 (not main)
Replay-affecting (changes the region-4 encounter distribution + adds a monster). Same coupling as the Field Forge — needs `verify-score` redeployed on merge. Batched onto the existing content branch so ONE merge + ONE `supabase functions deploy` ships forge + Skarn together.

## Outcome
- `quest.ts`: `MONSTERS` += `skarn` (elite, hp130/atk24/def13, gp [800,2200], drops blood_rune 0.6 / rune_battleaxe 0.2 / rune_platebody 0.1 — Wilderness rune-gear, deliberately NOT the deep elites' guaranteed 16.7k bone, to avoid a mid-game printer). `REGIONS[4]` (wilderness_ruins) `elite: 'skarn'` + flavor. Generalized the `ELITE_CHANCE` comment (no longer Maw-only).
- Everything else generic: spawn (`ELITE_CHANCE`), intro, combat, drop mint, `eliteSlain`, Bestiary, silhouette — free.
- Test: mirrors the Vorkanth test — flee all until Skarn appears (100 seeds × 6 steps), fell at 1 hp, assert `eliteSlain===1` + `checkInvariants`; pins `REGIONS[4].elite==='skarn'`.
- 252/252 unit (+1), 9/9 e2e. Sim seed 42 ×10k: **hash fe75df57 (byte-identical to before)**, 0 rejected, invariants OK — elites are expedition-only, market untouched. `engine.js` rebuilt (88.6kb).

## Gates
- [x] New elite spawns/resolves, elite credit, conserved (engine test + checkInvariants)
- [x] Tier-balanced drops (no mid-game bone printer)
- [x] Full suite + e2e green; sim hash unchanged; `engine.js` rebuilt
- [ ] **PENDING (Jesse): merge PR #1 + `supabase functions deploy verify-score`** (forge + Skarn ship together)
