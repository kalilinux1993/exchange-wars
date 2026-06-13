# Phase: Exchange Wars — Phase 17g: Mark the recommended dive region on the RegionMap (Brick 241)

**Started:** 2026-06-12
**Hat:** Builder (adventure UX — point the readiness advice at the map you click)
**Goal:** Ring the deepest region you're favored to farm (16x `diveReadiness.ready`) on the RegionMap, so the
text advice ("your safe depth is {region}") has a spatial pointer on the node-graph where you actually pick
a region to dive.
**Done condition:** The recommended region node shows a distinct `.maprec` ring; `ready === -1` (outmatched)
shows none; suite + e2e green.

## Why this brick
16x added a textual readiness readout, but the RegionMap right above it — where you click a region to embark
— gives no hint which node the advice means. A green "aim here" ring on the recommended node maps the text
to the action (click THIS one). Reuses `diveReadiness` (16x); pivoting to adventure for breadth after a run
of trading/UX bricks.

## Design — a `recommended` prop + a green ring, computed once in EmbarkPanel
- `RegionMap.tsx`: new optional `recommended?: number` prop (a region index, -1/undefined = none). On the node
  at that index, add a `recommended` class to its `<g>` and a `.maprec` ring (green, distinct from the gold
  `.mapsel` selection ring — they can coexist concentrically when the recommended region is also selected).
- `EmbarkPanel.tsx`: hoist `eff = deriveStats(...)` + `readiness = diveReadiness({atk,def,hp:trainedMax},
  progress)` to panel scope (the 16x readout currently recomputes them inside an IIFE); pass
  `recommended={readiness.ready}` to RegionMap and reuse `readiness` in the readout (compute once, use twice).
- `styles.css`: `.maprec` (green dashed ring).

## Scope (in)
- `RegionMap.tsx`: `recommended` prop + the `.maprec` ring + `recommended` g-class
- `EmbarkPanel.tsx`: hoist eff/readiness, pass `recommended`
- `styles.css`: `.maprec`
- `app.test.tsx`: RegionMap with a `recommended` index rings that node; `-1`/absent rings none

## Scope (out)
- No change to the 16x text readout's wording or the node state/halo/selection visuals
- No engine change — no redeploy

## Subsystems touched
- packages/ui/src/components/RegionMap.tsx
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] the recommended node rings (`.maprec` + `.recommended` g-class); none when recommended is -1/absent
- [x] UI suite (404, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)
- [x] EmbarkPanel computes `diveReadiness` once (hoisted) and shares it across the readout + the map ring

## Open questions
- None — reuses 16x `diveReadiness`; the ring mirrors the existing `.mapsel` ring pattern.
