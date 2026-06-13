# Phase: Exchange Wars — Phase 17z: A "movers" market track (the momentum axis gets its filter) (Brick 260)

**Started:** 2026-06-13
**Hat:** Builder (trading — complete the momentum tooling to match volatility's)
**Goal:** Add a `movers` filter track to the MarketTable that surfaces items whose last price has
dislocated meaningfully from its EMA (|momentum| ≥ threshold) — a one-click "what's moving right now,"
most useful during events. Extract a pure `momentum()` helper (single source for the column, its sort,
and the new track) since the track would otherwise be the third inline copy of `(last−ema)/ema`.
**Done condition:** A `movers` chip filters to dislocated items (empty in a calm market); the `mom`
column + sort are unchanged behaviorally (now via `momentum()`); `momentum()` is unit-pinned; suite + e2e green.

## Why this brick
The volatility axis has the full tooling set: ticket read (14p) → sortable column (16y) → "steady" track
(17h). The momentum axis has only the `mom` column (17o) + sort — no track. A `movers` track completes the
parallel: a saved filter for "show me what's dislocated from its mean," which is exactly the lens you want
the moment an event fires and the otherwise-anchored economy starts moving. Sorting by mom does most of this
already, but a track is the persistent "what's moving" view (the same convenience `steady`/`cheap` give over
sorting). Adding it makes `(last−ema)/ema` appear in THREE places (sort `numOf`, the cell, the track), which
is the right trigger to extract the pure `momentum()` helper — DRY + unit-testable, the same move that gave
`flipMargin`/`bandPosition`/`priceSwing` their single sources.

## Design — extract `momentum()`, add the track
- `game.ts`: `momentum(lastPrice, ema): number | null` — `(lastPrice − ema)/ema` when `ema > 0`, else null.
  Pure, near `flipMargin`/`marketMood`. The single source for the column, its sort key, and the track.
- `MarketTable.tsx`:
  - import `momentum`; `numOf` (mom branch) + the mom cell now call `momentum(...)` (behavior-preserving).
  - `MOVER_THRESHOLD = 0.05` (5% off EMA — meaningfully dislocated; baseline anchors near EMA so the track is
    empty until something moves).
  - `inTrack` gains a `movers` branch (needs `ema` added to its param type): `const mom = momentum(m.lastPrice,
    m.ema); return mom !== null && Math.abs(mom) >= MOVER_THRESHOLD;`
  - `'movers'` added to the track union + the chip array + a tooltip.

## Scope (in)
- `packages/ui/src/game.ts`: `momentum()` helper
- `packages/ui/src/components/MarketTable.tsx`: use `momentum()` in the 2 existing spots + the `movers` track
- `packages/ui/test/app.test.tsx`: `momentum()` unit (sign + ema≤0 → null) + a movers-track component test

## Scope (out)
- No new column (track only — the mom column already exists); no threshold UI (fixed 5%); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `movers` track shows dislocated items (+20%, −10%), hides anchored (+2%) + no-EMA; column/sort unchanged via `momentum()`
- [x] `momentum()` unit-pinned (positive, negative, zero, ema=0 → null, ema<0 → null)
- [x] UI suite (426, +2 new) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the established track pattern (17h steady) + helper-extraction pattern (flipMargin/bandPosition).
