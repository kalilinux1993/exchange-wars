# Phase: Exchange Wars — Phase 21i: live price-move % on the active-event chip (Brick 327)

**Started:** 2026-06-13
**Hat:** Builder (events — surface the magnitude that decides whether an event is tradeable)
**Goal:** The active-event chip (newsbar) shows the event kind + ticks left, but not HOW MUCH the price has
moved since the event began — the magnitude that distinguishes a 2% wiggle from a 15% craze worth trading.
The start EMA is already captured (`seenEvents.startPrice`, used by the end-recap 15z); surface the LIVE move.
**Done condition met:** yes — a pure `eventMove(startPrice, currentEma)` (rounded % vs the start EMA, the
recap's basis; null until captured / on invalid prices) drives a "· ±X%" on each chip; unit + App-render
tests; suite + e2e green; typecheck clean.

## Design
- `eventMove(startPrice, currentEma)` mirrors the end-recap's math (15z: `(end−start)/start`), reading the
  same `seenEvents.startPrice` (start EMA, captured by updateNews) and the current `books[itemId].ema`. EMA
  basis (not lastPrice) for consistency with the recap + less noise. null when startPrice isn't captured yet
  (the capture lands on the next updateNews after the event begins) → the chip just omits the % briefly.
- Chip: insert "· ±X%" between the label and the "· N left" countdown. Plain text (no colour class) to avoid
  clashing with the chip's event-kind background; the sign carries direction.

## Scope (in)
- packages/ui/src/game.ts (pure `eventMove`)
- packages/ui/src/App.tsx (import + the chip's move span)
- packages/ui/test/app.test.tsx (eventMove units + a newsbar-chip render assertion)

## Scope (out — explicit non-goals)
- Buy/sell DIRECTION advice (engine-assumption — just show the factual move, like the recap)
- Gating by event kind (the recap shows a move for any event with a startPrice; stay consistent)
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/{game.ts, App.tsx}
- packages/ui/test/app.test.tsx

## Gates
- [x] eventMove: rounded % vs start EMA; null on undefined/≤0 start or current
- [x] the newsbar chip renders "· ±X%" when a move is known; existing "450 left" chip test unbroken
- [x] typecheck clean; UI suite 511 (+3); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- Could also colour the % by direction if it reads well on the chip backgrounds — deferred (clash risk).
