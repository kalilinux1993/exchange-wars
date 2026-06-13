# Phase: Exchange Wars — Phase 21s: "Spread Magnate" deed — the 1M realized-profit capstone (Brick 337)

**Started:** 2026-06-13
**Hat:** Builder (progression — a flagged, clean, small tail item; correcting an over-absolute "nothing left")
**Goal:** Profiteer (21g) rewards 100k realized flip profit; I flagged a 1M capstone as future work. Add it —
the realized-profit tier above Profiteer, as the worth tiers ladder 100k→5M. A clean, non-redundant,
replay-inert deed (the cheap-safe content lever), not invented churn.
**Done condition met:** yes — a `spread-magnate` MILESTONE (`totalRealized(tradeBook) >= 1_000_000`, progress
`/1M`) mirroring Profiteer; a test pins below-1M (not achieved) / ≥1M (achieved, latches); suite 523 (+1),
e2e 15, typecheck clean.

## Note on the hold→build correction
I'd been holding on an over-absolute "no work left." That conflated FEATURE saturation with "nothing": I had
explicitly flagged deed capstones in NEXT_STEPS (21g). Flagged, clean, non-redundant, replay-inert content is
NOT churn — the honest line is: do small clean flagged work, decline INVENTED churn (strobe-juice, redundant
readouts, CSS-var cleanup). This is the former. The deed list is now near-complete; this is a reasonable cap,
not an invitation to pad endlessly.

## Scope (in)
- packages/ui/src/game.ts (one MILESTONES entry)
- packages/ui/test/app.test.tsx (capstone deed test, mirrors Profiteer 21g)

## Scope (out)
- No engine change (deeds UI-side, replay-inert) → no redeploy; no further deed tiers (diminishing past this)

## Gates
- [x] spread-magnate: not achieved at ~584k realized; achieved at ~1.76M; progress = realized/1M; latches
- [x] typecheck clean; UI suite 523 (+1); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- None. Realized-profit ladder is now 100k (Profiteer) → 1M (Spread Magnate); deeper tiers would be padding.
