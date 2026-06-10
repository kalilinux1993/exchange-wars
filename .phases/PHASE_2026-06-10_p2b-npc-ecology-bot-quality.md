# Phase: Exchange Wars — Phase 2b: NPC Ecology + Bot Quality

**Started:** 2026-06-10
**Hat:** Builder
**Goal:** Fix the two long-run economy pathologies (noise-trader extinction, producer gp hoarding) with ledger-explicit flows, and make the baseline flipper respect cost basis and use its paid slots.
**Done condition:** 100k-tick sim shows noise/momentum traders alive (bailout counter > 0, their wealth not collapsed) and producer gp growth tamed; flipper profit on gate seeds ≥ current baseline (+815/+1,146/+919 at 6k); all existing gates green; new ecology tests green.

## Scope (in)
- NPC bailout: noise/momentum traders topped back to starting gp when nearly broke (cooldown-gated), minted via ledger (modeling new entrants) + `stats.npcBailouts`
- Producer upkeep: production pays `baseCost × units` gp, **burned** (raw materials) when affordable — tames the hoard
- Flipper cost-basis floor: track entry price in memo, never re-list below post-tax break-even while position is fresh; stale-hold escape after 200 ticks
- Flipper multi-slot buying: up to 2 concurrent flips across distinct items when slots allow
- test/ecology.test.ts: bailout (incl. cooldown), upkeep (incl. broke-producer bootstrap), basis-floor listing behavior

## Scope (out)
- Market-maker ecology (their wealth is stable)
- Automation tiers beyond slots, UI, server
- Any change to exchange matching/escrow internals

## Subsystems touched
- src/engine/agents.ts (TUNING.npc, bailout, upkeep, actPlayer v3), src/engine/types.ts + sim.ts (stats.npcBailouts), src/engine/report.ts (bailout count), test/ecology.test.ts (new)

## Gates
- [x] Ecology unit gate — green (ecology.test.ts, 8 tests incl. review-driven orphan-cleanup + weighted-basis)
- [x] All existing gates green; flipper profit ≥ baseline on gate seeds (+935/+1,174/+1,098 vs +815/+1,146/+919)
- [x] 100k-tick ecology verification — noise 478 gp → 1.68M (479 bailouts), producer hoard 1.0B → 115M, flipper +7,915 → +22,895
- [x] Adversarial review — conservation/determinism on new paths confirmed airtight; 2 confirmed bot-bookkeeping bugs FIXED (post-cancel bookkeeping, weighted-average basis); bailout-farming → FINDINGS #13 as future gameplay

**Closed:** 2026-06-10 — done condition met.

## Open questions
- Bailout floor/cooldown tuning (draft: below 20% of start, 500-tick cooldown)
- Does the basis floor cause inventory sit in down markets? (stale-hold escape should bound it)
