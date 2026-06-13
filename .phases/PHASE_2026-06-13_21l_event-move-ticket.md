# Phase: Exchange Wars — Phase 21l: event move % at the trade decision point (ticket) + full market-sanity gate (Brick 330)

**Started:** 2026-06-13
**Hat:** Builder (events — complete 21i: the move at the DECISION point) + a periodic full-project health check
**Goal:** 21i put the live event price-move on the newsbar chip, but the chip JUMPS you to the ticket — the
actual decision point — and the ticket's event note only says "craze active — ends in ~N ticks", not HOW MUCH
it's moved. Surface the move there too. Also run the full market-sanity gate (under-run this session).
**Done condition met:** yes — the ticket `eventNote` (formatted in App) gains "· ±X%" via the existing
`eventMove`, suppressed at 0% (no move yet); the 21i chip also suppresses its brief "+0%"; a ticket test
asserts the move at the decision point; UI suite + e2e + the FULL engine suite + sim (seeds 11/42/1337) green.

## Design
- App's inline `eventNote` builder: compute `eventMove(seenEvents.startPrice, books[itemId].ema)` (same as the
  chip) and insert "· ±X%" between the label and "— ends in ~N ticks", ONLY when the move is non-zero. The 0%
  suppression both reads cleaner (no "+0%" at start) AND preserves the existing eventNote test (which renders at
  event start where move==0 → note unchanged). Apply the same `!== 0` guard to the 21i chip for consistency.
- Gate with the FULL `npm test` (engine purity/determinism/conservation) + `npm run sim` on seeds 11/42/1337 —
  a periodic confirmation that 13 bricks of UI-only changes haven't perturbed the engine's hard constraints.

## Scope (in)
- packages/ui/src/App.tsx (eventNote move% + the chip's 0% suppression)
- packages/ui/test/app.test.tsx (ticket event-move test)

## Scope (out — explicit non-goals)
- Buy/sell direction (engine-assumption — factual move only, as in 21i); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] ticket eventNote shows "· ±X%" when moved; "craze active — ends in ~N ticks" unchanged at 0% move
- [x] chip no longer shows "+0%" at event start (consistency)
- [x] typecheck clean; UI suite green; e2e 15 (1 on-demand skip)
- [x] FULL `npm test` green (20 files / 659 tests) + sim seeds 11/42/1337 invariants OK; seed-42 hash fe75df57 UNCHANGED
- [x] UI-only — no engine change, no redeploy

## Open questions
- None — small completion of the 21i event-move thread + a health checkpoint.
