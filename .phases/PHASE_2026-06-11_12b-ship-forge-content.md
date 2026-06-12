# Phase: Exchange Wars — Phase 12b: Ship the Forge/Skarn/Altar Content (Brick 106)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Merger (release the parked replay-affecting content after measuring the risk to zero)
**Goal:** Merge `feat/forge-event` (Field Forge event + Skarn elite + Blood Altar event) into main, now that the leaderboard is proven dormant (1 test row) so the verify-score-redeploy gap can't harm real players.
**Done condition:** branch merged to main, full gate green (typecheck + 284 unit + e2e + sim invariants), engine.js rebuilt, redeploy obligation flagged loudly, pushed + CI green + live bundle verified. **MET (pending CI/live confirmation at commit time).**

## Why now (the reversal)
For ~18 autonomous bricks the content was parked: shipping replay-affecting engine code without redeploying verify-score in the same phase creates a worth-discrepancy, and `SUPABASE_ACCESS_TOKEN` isn't available in autonomous sessions. Brick 106 probed the live board and found it holds exactly ONE row (`seed:666, handle:"jesse", worth:5460, deepest:0` — Jesse's own test, no expeditions). The verifier takes only `{handle,seed,log}` (no claimed-hash gate) → a stale verifier soft-flags, never hard-rejects. Dormant board + soft-flag-only = blast radius ≈ nil. The parking stance (correct while the cost was unknown) expired the moment the cost was measured to zero.

## What merged
- `packages/engine/src/quest.ts`: `EventState.kind` += `'forge' | 'altar'`; `FORGE_COST=300 FORGE_ATK=8 BLOOD_HP=20 BLOOD_ATK=14`; Skarn monster (hp130/atk24/def13, gp[800,2200], elite, drops blood_rune/rune_battleaxe/rune_platebody); `wilderness_ruins.elite = 'skarn'`; `ELITE_CHANCE=0.1`.
- `packages/engine/src/commands.ts`: forge + altar added to the encounter pool at rIdx≥2; `choose`-command handlers (forge burns FORGE_COST→gpBurned, sets `exp.boost`; altar refuses if `exp.hp <= BLOOD_HP` else spends hp for atk); elite spawn `if (region.elite && rng.chance(ELITE_CHANCE))`.
- `packages/ui/src/components/ExpeditionPanel.tsx`: accept-label map += `forge: 'whet the blade'`, `altar: 'spill blood'` (auto-merged cleanly alongside main's `regionDanger`).
- `supabase/functions/verify-score/engine.js`: rebuilt via `npm run build:fn` so the verifier bundle matches the merged engine source.

## Conflicts resolved
- `FINDINGS.md`, `NEXT_STEPS.md`: took `--ours` (main/HEAD — more current; the branch's doc edits carried stale "awaiting merge" notes). Then hand-updated NEXT_STEPS to mark the three features SHIPPED + a loud pending-redeploy banner.
- One stale test: `app.test.tsx` `regionDanger` expected wilderness_ruins' pre-elite profile (fire_giant atk19/def11/hp85, elite:false). Updated to the merged Skarn profile (atk24/def13/hp130, elite:true) — Skarn out-threats the pool 37>30 by atk+def. The test was load-bearing: it caught the content's intended effect.

## Gates
- [x] Typecheck clean
- [x] 284/284 unit (regionDanger test updated to new profile)
- [x] 9/9 e2e (1 on-demand screenshot skipped)
- [x] Sim seed 42 / 10000 ticks: 0 rejected, invariants OK, prices anchored in [cost..value] bands, flipper profitable
- [x] engine.js rebuilt (89.2kb) + committed
- [ ] **verify-score redeploy — PENDING, needs Jesse + SUPABASE_ACCESS_TOKEN.** One command: `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv`. Until done: soft worth-discrepancy only, dormant board, no hard rejects.

## Follow-ups
- Redeploy verify-score (above) — the single open obligation from this phase.
- Idea seeded: named elites for shallow regions 0–3; a defensive brew/altar (gp/hp → def) to round out the boost matrix.
