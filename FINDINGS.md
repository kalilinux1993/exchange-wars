# Findings

## Phase 2 (2026-06-10)

7. **Noise traders go extinct over long runs.** At 100k ticks (seed 42), the 6 noise traders are down to 478 gp combined (from 8k each) and momentum traders lost ~44% — tax + bad trades bleed them out. The flipper's prey dies off; very-long-run markets go sterile. Fix direction (Phase 2 continuation/3): NPC bankroll top-up or respawn, treated as explicit ledger mint.
8. **Adversarial review of the protocol: slot/conservation machinery confirmed solid** (OOB cost-schedule indexing defended, buySlot ledger-exact, full-fills don't occupy slots). Two bounded behavioral notes on the baseline flipper, deliberately NOT fixed (writing a better bot is the game): (a) re-listing at bestAsk−1 can undercut itself down to the producer floor in thin books — bounded by producers always quoting cost×1.05; (b) the strategy rests at most one buy order, underusing paid slots.
9. **Slot constraint costs the flipper ~30% profit** (+1,583 vs +2,234 at 10k ticks) — confirms slot unlocks are a meaningful progression lever, not decoration.

## Phase 1 (2026-06-10)

1. **Thin flips lose to tax + drift.** The flipper was breakeven-to-negative (seed 1337: −108 over 6000 ticks) when it accepted any post-tax profit ≥ 2 gp. Adding a 3% minimum-margin entry filter (`TUNING.player.minMarginPct`) made it profitable on every seed tested AND reduced variance. Same lesson as real GE flipping: entry selectivity beats trade frequency.
2. **The purity gate tripped on its own documentation** — a comment saying "never Math.random()" contains the banned string. Fix: the gate strips comments before grepping. Bans apply to code, not docs.
3. **Self-trade skip leaves a crossed book by design** (own bid above own ask can coexist). Within-side sort invariants still hold; spread-consuming code must guard for negative spread (market maker floors it, flipper checks `sellAt <= buyAt`). Confirmed non-bug by adversarial review.
4. **Prices equilibrate at the cost floor, not mid-band** — supply (producer batch 2/cadence 6) slightly exceeds demand (consumer burn 1/cadence 5 × 3), so producers undercut to cost×1.05. Intentional: a slightly-glutted market is the boring baseline the player's market-cornering should disrupt in Phase 2.
5. **Producers are a wealth black hole** — consumer wages flow to producers who never spend (101M gp by tick 10k). Conservation holds (ledger tracks it), but Phase 2 should give producers a gp sink.
6. **Adversarial review (pre-commit) verdict: SOUND, zero critical/major.** Hardening applied: `agentById` now asserts the id==index coupling; two regression tests added (fill-below-limit escrow split, mid-book self-trade skip).
