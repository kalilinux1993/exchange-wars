# Phase: Exchange Wars — Phase 15x: "Your Holding Moved" Away-Bar Line (Brick 206)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — personal offline feedback)
**Goal:** Add a PERSONAL mover to the "while you were away" bar — the biggest-moving item you actually
HOLD — so returning shows not just what the market did (the generic top mover) but what YOUR positions
did while you were gone.
**Done condition:** When you return from an away gap holding an item whose price moved ≥3%, the away-bar
shows "💼 your {item} ±X% ({start}→{end})" (deduped against the market top-mover); suite + e2e green.

## Why this brick
The away-bar's `topMover` (14y) reports the market's biggest move while away — "the world didn't sleep."
But it's impersonal: it might be an item you neither hold nor watch. The more relevant question on return
is "what happened to MY money?" — the biggest swing among your own holdings. The data is already there:
`planOfflineProgress` captures `pricesBefore`, and the post-away `playerView` has both `markets` and
`inventory`, so the held-position mover is `biggestMover` over the held subset — no new capture, no engine
change. (This is the salvageable, price-only half of the away-feedback idea; the away-FILLS half stays
engine-gated by the 512-trade window, per 15q.)

## Design — a testable helper + one away-bar line
- `game.ts`: `heldMover(before, markets, inventory)` = `biggestMover(before, markets.filter(held))` — the
  personal complement to the market-wide mover; named + pure so it unit-tests deterministically. Add
  `heldMover: MarketMover | null` to `OfflineResult`; `finishOfflineProgress` fills it from `after`.
- `App.tsx`: in the away-bar, after the `topMover` span, render "💼 your {item} ±X% ({start}→{end})" —
  shown only when it exists AND differs from `topMover` (no redundant double-report of the same item).

## Scope (in)
- `game.ts`: `heldMover` + `OfflineResult.heldMover` + `finishOfflineProgress` wiring
- `App.tsx`: the held-mover away-bar line (deduped vs topMover)
- `app.test.tsx`: `heldMover` unit (held vs unheld; hold-nothing → null)

## Scope (out)
- No away-FILLS (engine-gated, 15q); no change to `topMover`; no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `heldMover` returns your biggest-moving HELD item, ignoring unheld ones; null when you hold nothing (or a zero balance)
- [x] the away-bar shows the "💼 your {item} ±X%" line (deduped vs topMover)
- [x] UI suite (355, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `biggestMover` + the offline plan's captured prices.
