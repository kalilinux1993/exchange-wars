# Phase: Exchange Wars — Phase 8k: Expedition Economy Audit (Brick 11)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Analyst (measure before more content)
**Goal:** Expeditions consume no world ticks — in a 2k sprint the grind is bounded only by SPRINT_MAX_COMMANDS (5,000). Measure: what does a deterministic fists-first grinder score vs the manual-trading benchmark (5,460)? Decide whether a lever is needed (candidate: advance consumes a world tick — thematically right, bounds the grind, replay-compatible) or whether the meta is fine.
**Done condition:** grinder measured across seeds via verifySprint (the real arbiter); FINDINGS verdict written; lever shipped this phase ONLY if numbers demand it; gates green. **MET.**

## Outcome
- Pre-lever grind: verified 71,596–83,995 (+16.6k–29k over the 55,000 idle baseline), all 5 seeds maxing the 5,000-command cap. Degenerate confirmed.
- Lever v1 (advance only): verified scores identical on all 5 seeds — combat stayed free, command cap still bound. Insufficient, extended.
- **Lever v2 shipped**: advance + fight/flee/eat each consume one world tick (embark/extract/choose free). Grind now clock-bounded: ~2,270 cmds, +7.4k–12.7k. Solved mystery: the 5,460 board entry = 55,000 − ~50k autoFlip hire + clerk profit (clerk-trade benchmark 4,548–5,504).
- Grinder promoted to `tools/audit-grind.ts`; parity tuning + heal-loop pricing queued in NEXT_STEPS with data.

## Scope (in)
- tools/audit-grind.ts (embark→fight/eat/decline→extract loop under the caps), verifySprint scoring, clerk-trade benchmark
- Lever v2 in commands.ts; test rework (tick-cost contract); UI copy (+1 tick labels/tooltips)
- FINDINGS #45 with numbers + decision

## Gates
- [x] Measurement honest (verifySprint-scored, multiple seeds) — 5 seeds, before/after, clerk + idle benchmarks
- [x] Any lever shipped = full gates + fn redeploy — typecheck green, 160/160 tests, verify-score rebuilt (68.9kb) + deployed, preflight 200
