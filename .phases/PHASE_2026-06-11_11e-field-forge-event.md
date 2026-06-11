# Phase: Exchange Wars — Phase 11e: Field Forge event (Brick 83) — BRANCH feat/forge-event

**Started:** 2026-06-11
**Closed:** 2026-06-11 (on branch — NOT merged to main)
**Hat:** Builder (engine content — a gp sink that aids raiding)
**Goal:** A new expedition event (Field Forge): buy a dive-long Attack boost with loot gp. The first gp→combat-boost path; a real gp sink.
**Done condition:** new event spawns deep, resolves conserved, composes with brew boosts; full gate green; `engine.js` rebuilt. **MET (branch).**

## Why a branch (NOT main)
Adding 'forge' to the `rollEncounter` pool is **replay-affecting** (changes `rng.pick` for deep events). The deployed `verify-score` Edge Function runs a separately-bundled `engine.js`; until it's redeployed (`npm run build:fn` + `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv`, needs `SUPABASE_ACCESS_TOKEN`), live sprints hitting the forge would verify against the OLD encounter distribution — a soft, self-healing, but outward-facing leaderboard discrepancy. Per the coupling rule, merge + redeploy must happen together. This autonomous session has no token, so: Draft on a branch + PR, ready for Jesse to merge **and** redeploy in one go. `engine.js` is rebuilt in-repo so the branch is internally consistent.

## Outcome
- `quest.ts`: `EventState.kind` += `'forge'`; `FORGE_COST=300`, `FORGE_ATK=8`.
- `commands.ts`: 'forge' in the spawn pool at region idx ≥2; prompt; resolution — pays `FORGE_COST` from packGp (booked `gpBurned`), sets `exp.boost = { atk: max(prev, FORGE_ATK), def: prevDef }` (composes with brews, never downgrades); too-poor path is a free no-op.
- `ExpeditionPanel.tsx`: one-line accept label 'whet the blade' (generic event UI did the rest).
- Tests: forge accept (fee burned, boost up, conserved), composes-with-brew (no downgrade), too-poor no-op — all `checkInvariants`. 251/251 unit (+1), 9/9 e2e. Sim seed 42 ×10k: 0 rejected, invariants OK, market unchanged.

## Gates
- [x] New event spawns/resolves, conserved (engine tests + checkInvariants)
- [x] Composes with existing boost; too-poor no-op (tests)
- [x] Full suite + e2e green; sim healthy; `engine.js` rebuilt
- [ ] **PENDING (Jesse): merge to main + `supabase functions deploy verify-score`** (replay-affecting → must ship together)
