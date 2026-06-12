# Phase: Exchange Wars — Phase 12n: Flip Consistency / Trade Record (Brick 118)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (trading — add the consistency/hit-rate lens to the realized-profit panel)
**Goal:** On the Profit by Item panel, show how CONSISTENT your flips are — items closed in profit vs at a loss, and your single worst item (the one the top-by-profit list hides). UI-only, live on main.
**Done condition:** consistency line in ProfitPanel (hit-rate + worst item) from the lifetime book; pure helper tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Considered-and-rejected this brick: engine content
With UI ideas thinning, I evaluated an engine-content brick (named elites for the shallow regions 0–3 — incl. canonical OSRS bosses Obor/Bryophyta). Rejected after measuring the blast radius: adding `elite` to a region inserts an `rng.chance(ELITE_CHANCE)` call into `rollEncounter`, and `lumbridge_plains` (region 0) is the workhorse of `expedition.test.ts` — dozens of fixed-seed `advance`/encounter assertions run there. The extra RNG draw would shift the cursor and cascade-break those deterministic tests. **High blast-radius engine work is the wrong call for an unsupervised autonomous brick** — recorded in FINDINGS #152. (12b avoided this by adding its elite to region 4, which the tests barely touch.) Engine content is parked for when Jesse is present to review + redeploy.

## Outcome
- `game.ts`: `tradeRecord(book)` → `{winners, losers, best, worst}` — pure; scores items by NET realized profit (reuses the profit-desc `realizedFromBook`, so best/worst are its ends).
- `ProfitPanel.tsx`: a consistency line under the realized/paper header — "profitable on W of N items · worst <item> <loss>" (worst only when there is a loss). The magnitude (totalRealized) + per-item list were already there; this adds hit-rate + the hidden worst.
- Tests (+3): `tradeRecord` (winners/losers + best/worst by net profit; empty → zeros/nulls) + a ProfitPanel render (one win + one loss → "of 2 items" + "worst"). 332/332 unit, 9/9 e2e. FINDINGS #152.

## Gates
- [x] `tradeRecord` pure (counts + standouts + empty)
- [x] ProfitPanel renders the consistency line (render test)
- [x] Typecheck + 332 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Per-round-trip win rate (vs per-item) would need the book to retain individual closes — bigger.
- Engine content (shallow-region elites, defensive brew/altar) — batched for a Jesse-present session (review + verify-score redeploy in one pass with the still-pending 12b redeploy).
