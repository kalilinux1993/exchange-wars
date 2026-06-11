# Phase: Exchange Wars — Phase 8l: Wounds Are Real (Brick 12)

**Started:** 2026-06-11
**Hat:** Designer/Tuner (price the heal loop with mechanics, not nerf numbers)
**Goal:** Kill the extract→re-embark free-heal exploit (FINDINGS #45): hp becomes persistent on the player — expeditions carry wounds in AND out, death leaves you at 1 hp, and healing happens out-of-field at a slow per-tick regen. Hurt raiders must rest (= trade) before diving again; food and shrines matter again.
**Done condition:** persistence + regen shipped with tests (carry-in/carry-out/death/regen-rate/old-save compat); grinder re-measured with an honest wait-to-heal policy; verify-score redeployed; gates green. **MET.**

## Outcome
- Naked grind: +7.4k–12.7k → **+0.3k–3.9k** across a rest-threshold sweep (15/25/35/50 × 5 seeds); best policy = dive hurt at 15hp. Exploit dead; FINDINGS #45's loot-parity item resolved as a side effect (FINDINGS #46).
- 162/162 tests (2 new: wounds persist + no field mending); never-wounded saves byte-identical (absent = full).
- verify-score rebuilt (69.5kb) + redeployed.

## Scope (in)
- engine: `AgentState.hp?` (absent = full — old saves untouched), embark seeds exp.hp from it, extract/death write back, out-of-field regen in tickWorld (pure, no RNG)
- UI: resting/recovery hint in the Expeditions panel when wounded at home
- tools/audit-grind.ts: wait-to-heal policy, re-measure 5 seeds
- FINDINGS entry with before/after numbers

## Scope (out)
- Loot-magnitude parity tuning (separate queued pass — this phase may move its numbers, so it re-measures first)
- New content (regions/monsters/events)

## Gates
- [x] Determinism untouched: NPC-only sims byte-identical (regen no-ops when the field is absent) — market-sanity + manyseed suites green unchanged
- [x] Full suite + typecheck green; fn rebuild + redeploy (engine semantics change) — 162/162, deployed
- [x] Honest re-measure via tools/audit-grind.ts — rest-threshold sweep, 4 policies × 5 seeds
