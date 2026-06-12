# Phase: Exchange Wars — Phase 14y: "Biggest Mover While Away" (Brick 181)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — idle/offline retention)
**Goal:** Make returning from offline feel like the world kept living — surface the item
whose price moved most while you were away in the "while you were away" bar.
**Done condition:** The away-bar shows "📈/📉 {item} ±X% ({start}→{end})" for the biggest
mover when one cleared the news floor; suite + e2e green. **MET.**

## Why this brick
The away-bar reported what YOU/your sellsword earned, but the MARKET — the heart of the game —
moved silently. An idle game's signature payoff is "the world didn't sleep": coming back to
"Rune platebody soared +23% while you were gone." Fresh subsystem (idle/offline) untouched
this session.

## The snapshot was nearly free (the enabling find)
`planOfflineProgress` already computes `before = playerView(...)` (only used for a null-check),
so the pre-away per-item prices were already in hand. Capturing them cost one `Object.fromEntries`
over `before.markets` — no engine change, no new world snapshot.

## Design — capture before, diff after, pure picker
- `OfflinePlan.pricesBefore: Record<id, lastPrice>` captured in `planOfflineProgress` from the
  `before` view already computed there.
- `OfflineResult.topMover: MarketMover | null` set in `finishOfflineProgress` by diffing
  `pricesBefore` against a fresh `playerView().markets`.
- `biggestMover(before, after)` (game.ts, pure): max absolute %-move; skips items with no valid
  start/end price; returns null below a 3% floor (a flat market isn't news); iterates `after`
  (state order) for a deterministic tie-break.
- Away-bar: "📈/📉 {name} ±X% ({start}→{end})", green up / red down, beside the existing summary.

## Scope (in)
- `game.ts`: `biggestMover` + `MarketMover`; `pricesBefore`/`topMover` on the plan/result; capture + diff
- `App.tsx`: the mover line in the away-bar
- `app.test.tsx`: `biggestMover` unit (max move / 3% floor / skip invalid / empty) + a deterministic
  `finishOfflineProgress` plumbing test (flat→null; a halved pre-price → +100% mover)

## Scope (out)
- No engine change; no per-item history (one headline mover, not a board); not the fills/events
  variants (deferred follow-ups from the scout)

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `biggestMover`: largest abs move; 3% floor → null; skips invalid; empty → null
- [x] `finishOfflineProgress` reports the mover from captured prices (flat → null; halved start → +100%)
- [x] UI suite (319, +4) + e2e (9) green; typecheck clean; existing offline tests unbroken
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Follow-ups
- The scout's other away ideas (your fills while away; events that ended) are available with no new
  capture — candidate future bricks.
