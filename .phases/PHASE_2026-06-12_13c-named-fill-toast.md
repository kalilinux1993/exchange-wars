# Phase: Exchange Wars — Phase 13c: Named Fill Toast (Brick 133)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (trading feedback — name the item in the fill toast)
**Goal:** The resting-fill toast (13b) names the item for a single-item burst ("bought 50 Shark") instead of just a count, falling back to the aggregate for mixed fills. UI-only, live on main.
**Done condition:** single-item single-side fill bursts show "bought/sold N <item>"; mixed fills keep the aggregate; pure helper tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
13b's toast said "bought N · sold M" — you knew a fill happened but not WHAT. The common case is a single resting order clearing (all one item, one side), where naming it ("bought 50 Shark") is both feasible and far more useful — you know which capital deployed / which goods sold without opening a panel.

## Outcome
- `game.ts`: `fillToastFlavor(fills, nameOf)` — when every fill is the same item + same side, "bought/sold {qty} {name}"; otherwise falls back to `fillSummary`'s aggregate. Pure (name lookup injected).
- `App.tsx`: the fill toast now uses `fillToastFlavor` with the world's item-name lookup.
- Tests (+1): `fillToastFlavor` (single-item burst → named; mixed items → aggregate; empty → null). 359/359 unit, 9/9 e2e. FINDINGS #167.

## Gates
- [x] `fillToastFlavor` pure (named single-item / aggregate mixed / empty)
- [x] Typecheck + 359 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- (none — fill feedback is now both gated and informative.)
