# Phase: Exchange Wars — Phase 15c: Per-Region Raid Stats (Brick 185)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — raid analytics)
**Goal:** Answer "which region is my best (or deadliest) farm?" — a per-region risk/reward
breakdown of the Delve Log, alongside the existing all-dives totals.
**Done condition:** The Delve Log shows a "by region" summary (runs · deaths · net loot, best
farm first) once you've raided ≥2 regions; suite + e2e green.

## Why this brick
The Delve Log shows each dive chronologically + lifetime `raidTotals` (all dives banked vs lost),
but never groups by REGION — so "the Abyss keeps killing me, Brimhaven pays best" is invisible.
A per-region breakdown is the farm-optimization lens the data already supports. Verified novel:
no `raidTotalsByRegion`/per-region raid grouping exists (ConquestPanel's per-region view is MONSTER
mastery, a different axis). UI-only — pure aggregation over the existing `DelveRecord`
(regionId / lootGp / died).

## Design — pure group-and-rank helper + a gated summary
- `raidTotalsByRegion(delves)` (game.ts, pure) → per-region `{ regionId, runs, deaths, banked, lost,
  net }`, sorted by `net` desc (best farm first), then runs, then id (deterministic).
- DelvePanel: a compact "by region (best farm first)" list — `{region} · {runs}r · {deaths}☠ · ±net` —
  shown only when `≥2` regions have been raided (with one region the header totals already say it;
  the comparison is what's new). Green net up / red down, mirroring the log rows.

## Scope (in)
- `game.ts`: `raidTotalsByRegion` + `RegionRaid`
- `DelvePanel.tsx`: the by-region summary block
- `styles.css`: a small `.raidbyregion` style if needed
- `app.test.tsx`: helper unit (group/aggregate/sort) + a DelvePanel render (shows ≥2 regions, hidden <2)

## Scope (out)
- No engine change; no per-region win-rate % (runs/deaths is legible enough); not the per-dive item
  loot (Gap #1 — needs an engine-level loot-items accumulator, deferred)

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/DelvePanel.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] `raidTotalsByRegion`: per-region runs/deaths/banked/lost/net; ranked best-net first (B +1000 before A +300)
- [x] DelvePanel shows the by-region block at ≥2 regions; hidden at 1
- [x] UI suite (325, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — pure aggregation over the existing Delve Log.
