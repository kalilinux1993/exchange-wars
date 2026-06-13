# Phase: Exchange Wars — Phase 21j: dive survival report card in the Almanac (Brick 328)

**Started:** 2026-06-13
**Hat:** Builder (stats/Almanac — a push-your-luck self-assessment; different system for breadth)
**Goal:** The game is push-your-luck (bank vs push the dive), but your CLEAN-EXTRACTION RATE and AVG BANKED
HAUL per survived dive are shown nowhere — the streak (16f) and death count are, but not the rate/efficiency
that tells you whether you're too greedy or too cautious. Add a dive report card to the Almanac.
**Done condition met:** yes — a pure `diveSurvival(delves)` → {total, survived, survivalPct, avgHaul}
(banked loot averaged over SURVIVED dives only — a death banks nothing) drives a "dives survived: X/N (P%) ·
avg Y gp" row in the Almanac's "Your saga", gated to total>0; unit + first-ever AlmanacPanel render tests;
suite + e2e green; typecheck clean.

## Design
- `diveSurvival` is one pass over `game.delves` (UI-side): counts survived (!died), sums their `lootGp`
  (which IS the banked loot on a survived dive; a died dive's lootGp was lost — same mapping `raidTotals` uses).
  Pairs with the Untouchable deed (21f) and the streak readout (16f) — the rate behind the streak.
- Almanac row in "Your saga", after deaths (its natural neighbour). Reuses the panel's `fmt`. Gated to
  total>0 so a non-diver's Almanac stays clean.

## Scope (in)
- packages/ui/src/game.ts (pure `diveSurvival`)
- packages/ui/src/components/AlmanacPanel.tsx (one row + the import)
- packages/ui/test/app.test.tsx (diveSurvival units + an AlmanacPanel render test — the panel had none)

## Scope (out — explicit non-goals)
- Per-region survival breakdown (raidTotalsByRegion 15c already covers per-region net) — keep this a global card
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/{game.ts, components/AlmanacPanel.tsx}
- packages/ui/test/app.test.tsx

## Gates
- [x] diveSurvival: rate over all dives; avgHaul over survived only; all-zeros on none; avgHaul 0 if all died
- [x] Almanac shows "X/N (P%) · avg Y gp"; hidden with no dives
- [x] typecheck clean; UI suite 513 (+2); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- The margin alert (5th alert type) remains the highest-value un-built feature but overlaps the cheap-band
  alert + touches the bug-prone alert machinery (16e) — flagged for a focused (non-autonomous) session.
