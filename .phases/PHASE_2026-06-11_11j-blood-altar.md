# Phase: Exchange Wars — Phase 11j: Blood Altar (Brick 88) — BATCHED into PR #1

**Started:** 2026-06-11
**Closed:** 2026-06-11 (on branch feat/forge-event — NOT merged)
**Hat:** Builder (RPG content — a new resource exchange)
**Goal:** A new expedition event — the Blood Altar: spill HP for a dive-long Attack boost. The forge's inverse (health as currency), a real tactical gamble.
**Done condition:** new event spawns/resolves, refused when you can't spare the blood, ledger-free; full gate green; `engine.js` rebuilt. **MET (branch).**

## Why batched into PR #1
Replay-affecting (adds 'altar' to the rollEncounter pool → changes deep encounter RNG). Same coupling as forge/Skarn — needs `verify-score` redeployed on merge. 3rd feature on the content branch: ONE merge + ONE `supabase functions deploy` ships forge + Skarn + altar.

## Outcome
- `quest.ts`: `EventState.kind` += `'altar'`; `BLOOD_HP=20`, `BLOOD_ATK=14` (bigger than the forge's +8 — blood costs more than gold).
- `commands.ts`: 'altar' in the spawn pool at region idx ≥2; prompt; resolution — refused unless `hp > BLOOD_HP` (never lethal); else `hp -= BLOOD_HP`, `exp.boost = { atk: max(prev, BLOOD_ATK), def: prevDef }` (composes with brews). **Zero ledger change** (hp + boost only).
- `ExpeditionPanel.tsx`: one-line accept label 'spill blood'.
- Tests: accept (hp paid, boost up, `JSON.stringify(ledger)` byte-identical), composes-with-brew, refused-when-too-low (hp unchanged, no boost) — all `checkInvariants`. 253/253 unit (+1), 9/9 e2e. Sim seed 42 ×10k: **hash fe75df57 (byte-identical)**, 0 rejected, invariants OK. `engine.js` rebuilt (89.2kb).

## Gates
- [x] Spawns/resolves; refused when hp ≤ cost (never lethal); ledger-free (tests + checkInvariants)
- [x] Composes with brew boost (test)
- [x] Full suite + e2e green; sim hash unchanged; `engine.js` rebuilt
- [ ] **PENDING (Jesse): merge PR #1 + `supabase functions deploy verify-score`** (forge + Skarn + altar ship together)
