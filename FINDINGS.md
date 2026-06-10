# Findings

## Phase 1 (2026-06-10)

1. **Thin flips lose to tax + drift.** The flipper was breakeven-to-negative (seed 1337: −108 over 6000 ticks) when it accepted any post-tax profit ≥ 2 gp. Adding a 3% minimum-margin entry filter (`TUNING.player.minMarginPct`) made it profitable on every seed tested AND reduced variance. Same lesson as real GE flipping: entry selectivity beats trade frequency.
2. **The purity gate tripped on its own documentation** — a comment saying "never Math.random()" contains the banned string. Fix: the gate strips comments before grepping. Bans apply to code, not docs.
3. **Self-trade skip leaves a crossed book by design** (own bid above own ask can coexist). Within-side sort invariants still hold; spread-consuming code must guard for negative spread (market maker floors it, flipper checks `sellAt <= buyAt`). Confirmed non-bug by adversarial review.
4. **Prices equilibrate at the cost floor, not mid-band** — supply (producer batch 2/cadence 6) slightly exceeds demand (consumer burn 1/cadence 5 × 3), so producers undercut to cost×1.05. Intentional: a slightly-glutted market is the boring baseline the player's market-cornering should disrupt in Phase 2.
5. **Producers are a wealth black hole** — consumer wages flow to producers who never spend (101M gp by tick 10k). Conservation holds (ledger tracks it), but Phase 2 should give producers a gp sink.
6. **Adversarial review (pre-commit) verdict: SOUND, zero critical/major.** Hardening applied: `agentById` now asserts the id==index coupling; two regression tests added (fill-below-limit escrow split, mid-book self-trade skip).
