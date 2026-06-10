# Findings

## Phase 2c (2026-06-10)

14. **Idle automation must live engine-side, not bot-side** — automation inside `tickWorld` means offline fast-forward includes it for free. The `policy` split ('scripted-flipper' vs 'idle') cleanly separates active play from idle play without forking the strategy code (shared `runFlipper` core).
15. **Idle tier curve is non-monotonic under competition** — at 6k ticks/seed 42: tier 1 +227, tier 2 +1,769, tier 3 +518. The idle player competes with the scripted flipper for the same dislocations; cadence/phase interference between bots dominates tier parameters. Needs a multi-seed balance pass with isolated AND competitive scenarios. Payback period on tier 1 (~1.3M ticks) only makes sense under offline math (100k ticks ≈ 0.5s).

## Phase 2b (2026-06-10)

10. **The ecology fixes compounded into a flipper buff.** Bailouts keep speculators trading (noise wealth 478 gp → 1.68M at 100k ticks; 479 bailouts) which keeps dislocations coming; the basis floor stops the bot from selling at a loss; multi-flip uses idle capital. Net: flipper profit 3× at 100k ticks (+22,894 vs +7,915) without touching exchange internals.
11. **Production-cost burn is a massive but stable sink** — 905M gp burned over 100k ticks vs 18M before, and prices didn't move (still anchored at cost×1.05). The anchor comes from producer pricing policy, not from their cash position.
12. **Momentum traders still bleed slowly** (100k → 40k wealth at 100k ticks) even with bailouts — their strategy loses money faster than the bailout floor catches them. Acceptable: bailouts keep them functional, which is all the ecology needs.
13. **Review caught two bot-bookkeeping bugs, both fixed:** orphaned basis memo when an act cancels the position's only open buy (bookkeeping now runs post-cancel on a fresh view), and basis overwrite-on-top-up (now weighted-average over position size). Also flagged: a player could deliberately drain NPCs to farm bailout mints — logged as *future gameplay* (market manipulation is on-theme), not patched.

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
