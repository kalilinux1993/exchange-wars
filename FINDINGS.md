# Findings

## Phase 5b (2026-06-10)

31. **Real prices compressed the whole automation economy.** The all-staples wiki catalog (every item vol ≤ 0.10, prices ≤ ~2.7k, 1gp spreads) cut tier profits ~5× versus the fantasy catalog — realistic (actual GE staples are thin-margin) but it dissolved tier-3's "trades exotic goods" niche: its volatility ceiling is now inert because nothing exotic exists. Fix for the gate: tier-3 cadence 4→5. Design lever queued: give the generator a second selection track (a few high-volatility/high-price picks — herbs, gear) so tier 3 has a niche again and the price ladder regains a top end.
32. **Snapshot drift is a real re-roll source**: regenerating an hour apart moved prices enough to change every world (catalog values feed world-gen). Treat every regen like a code change: full gates + sweep budget.

## Phase 4i (2026-06-10)

29. **New RNG consumers re-roll the universe.** The contract spawner draws from the tick RNG stream, which shifted every downstream random decision on every seed — the balance gate tripped not because contracts touch markets (they don't) but because all the worlds changed. Corollary: ANY new world-RNG consumer triggers the routine tier-1 sweep. Tier 1 has now cycled cadence 10→8→7→8→9→10 across the catalog's life — landing back at its original value, with each stop locally correct for its era's world.
30. **Test collisions with live systems are good news.** The contracts UI test failed because a REAL contract spawned during its fast-forward and collided with the injected fixture — the spawner working as designed. Fixture isolation (clear spawned state) beats turning the system off.

## Phase 4h (2026-06-10)

26. **Events exposed that anchors only bind the anchored.** Producers floor their asks at cost and consumers cap bids at value — but during events those anchors LEAVE the market (slump: consumers gone → speculator death spiral to 0.24×cost; shock: producers gone → momentum bubble to 6× value). The economy's stability lived entirely in two agent archetypes' presence. Fixes: market makers became bargain hunters (bid floor 0.6×cost — the crash bottom), and all NPC speculative orders clamp to a fundamental band [0.55×cost, 1.25×value] ("greedy, not insane"). Bubbles and crashes still happen — dramatically — but inside survivable bounds.
27. **The clerk reads the news and stands aside.** Bots opening flips into event markets ate both directions (knife-catching in crashes, mean-reversion losses after bubbles). Rule: never open a flip on an item with an active event. This restored the entire balance gate without re-tuning a single tier number — and it makes events purely a HUMAN opportunity, which is exactly the right game design.
28. **Brainstorm runners-up** (queued, not built): NPC buy-contracts/quests ("deliver 50 lobsters at a premium"), prestige/rebirth loop, ghost-run leaderboards (deterministic replay = fair ghosts), tier-3 clerk perk "trades events too", news history panel.

## Phase 4g (2026-06-10)

24. **Sweep, don't probe.** Three sequential single-knob "fixes" for tier-1 marginality (cadence 7, vol 0.09, double stale-patience) each traded one failing seed for another — every config was tuned to the previous catalog size. A 6-config sweep over {cadence}×{vol ceiling} measuring the MIN cell across all scenario-seeds found cadence 8/vol 0.10 dominant on both min (+8,360) and average (+11,353) in minutes. Also measured-and-rejected: patience for a 1-flip bot (frozen capital = pure opportunity cost; made 3 seeds negative).
25. **Catalog growth keeps re-tuning tier 1.** Every items batch (14→18→22→28) re-exposed the same 1-flip bot's variance. The balance gate catches it within the iteration; the sweep harness makes the fix ~5 minutes. This is now routine maintenance, not crisis.

## Phase 4c (2026-06-10)

21. **Catalog growth breaks economies through liquidity dilution, not item math.** Tripling items (5→14) with a FIXED global speculator pool (4 momentum + 6 noise) spread liquidity so thin that books went one-sided and idle automation collapsed (tier 1 seed 7: −16,201). The real fix was world-generation: speculators now scale with catalog size (`max(4, items×0.8)` momentum, `max(6, items×1.2)` noise). After scaling, the tier curve isn't just repaired — it's the best it's ever been (tier 1 avg +6.5k/+8.4k, tier 3 +33.6k/+41.3k, monotonic, every seed positive, paybacks 48k–143k ticks).
22. **Two bot disciplines that earned their keep** (kept even after the root fix): exit-liquidity cap — never hold more than `bidDepth/2`, since stale-dump losses scale with position size (one 5-potion dump = −12.4k); volatility ceilings per automation tier (0.10/0.12/∞) — junior clerks trade staples, which is both risk control and progression flavor.
23. **Two plausible fixes that measured WORSE, reverted with data:** margin-%-ranking alone (didn't bind on the failing path) and a buy-below-EMA filter (backwards — EMA lags, so it admits falling-knife entries and blocks rising-market ones). Diagnosis by instrumented runs beats stacking clever heuristics.

## Phase 4b (2026-06-10)

20. **Browser E2E caught what build + jsdom structurally could not: `npm run dev` was broken since Phase 4a.** vitest 4 hoisted vite 8 (rolldown) to the root; `@vitejs/plugin-react` deduped against it; the UI's own vite 7 dev server then received vite-8-protocol plugin output (`Missing field 'moduleType'`). `vite build` worked (different pipeline) and jsdom tests bypass vite entirely — so every gate was green while the actual dev server 500'd. Fix: one vite (^8) across the tree. Lesson: **a layer you never execute is a layer that's broken** — the E2E suite now executes the served app for real.

## Phase 2d (2026-06-10)

16. **Tier-3's third concurrent flip was the bug, not cadence.** Idle players never buy slots (3 forever), so 3 concurrent flips jammed every slot, starved sell capacity, and forced stale-dumps of three positions into downturns — seed 99 isolated: **−4,306 gp**. Retuned tier 3 to speed (cadence 4, 2 flips, qty 10): every seed positive, isolated avg 366→1,734. Lesson: never give automation more concurrent positions than (slots − sell headroom).
17. **Cadence 3 over-churns** (seed 1337 → −4,437): faster re-entry after exits piles positions into downturns. Cadence 4 is the sweet spot at this strategy/slot count.
18. **Averages lie under outlier seeds; gate on medians.** Seed 42 tier 2 (+3,104) is a one-seed outlier that makes averages non-monotonic forever. The balance gate uses per-seed positivity (kills catastrophic regressions) + median ordering vs tier 1 (robust). Tier 2↔3 are near-tied at 150k capital — intentionally ungated; tier 3 capitalFraction 0.35 is currently inert (maxQty binds first) but will matter at late-game capital.
19. **6k ticks is too short a horizon for balance measurement** — flip cycles don't complete; tier-1 competitive even dips negative on one seed. Balance gate runs at 8k.

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
