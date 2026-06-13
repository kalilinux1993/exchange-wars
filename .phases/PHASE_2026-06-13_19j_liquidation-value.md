# Phase: Exchange Wars — Phase 19j: honest "cash out now" value on Open Positions (mark overstates exit) (Brick 296)

**Started:** 2026-06-13
**Hat:** Builder (honest-value instrument — the satchel's paper value isn't its cashable value)
**Goal:** PositionsPanel marks `value` and `paper` (unrealized P&L) at LAST price, but you can't sell N units AT
the mark — dumping a holding walks DOWN the bids (`bidWalk`), nets less after tax + slippage, and may not even
fill (bids run dry). The header shows an optimistic "value" with no honest exit figure. Add a portfolio-level
"cash out now ≈X" = the summed `bidWalk` net of liquidating every position into the resting bids right now.
**Done condition met:** yes — a pure `liquidateNow(game, positions)` returns `{ net, units, sold }` (net = Σ
per-position bidWalk net, own orders skipped, per-fill tax; `sold < units` when bids run dry); PositionsPanel
header shows "cash out now ≈{net}" with a tooltip on slippage/tax and a note when not all units would fill;
tests pin the helper + the header render; suite + e2e green; typecheck clean.

## Why this brick
Same optimistic-vs-real theme as 19e (forecast under-counted incoming damage) and 18w (realized P&L
over-counted): a displayed number flatters reality. "value" marks every unit at last trade, but the realizable
exit is the bid-walk net — lower by tax (~2%), by slippage (bids below the mark), and capped by depth (a thin
book can't absorb a big lot). A player reading "value 1.3M" who could only cash out ~1.0M right now is making
allocation/exit calls on a soft number. The honest figure makes paper-vs-cashable explicit, reusing the same
`bidWalk` (per-fill tax, own-order skip) the ticket already trusts for single-item sells — now at the
portfolio level, which isn't surfaced anywhere.

## Design — sum bidWalk net over held positions
- `game.ts` `liquidateNow(game, positions)`: for each `{ itemId, units }`, `w = bidWalk(game, itemId, units)`;
  accumulate `net += w?.net ?? 0`, `sold += w?.qty ?? 0`, `units += units`. Returns `{ net, units, sold }`.
  Pure (display read; `bidWalk` already skips the player's own bids + applies per-fill tax). Worst-case
  snapshot (bids don't refill mid-dump) — the conservative "fire-sale now" floor; patient selling beats it.
- `PositionsPanel.tsx`: in the header (where `value`/`paper` show), `liq = liquidateNow(game, positions)`;
  render " · cash out now ≈{fmtCompact(liq.net)}" with a tooltip ("what you'd actually receive dumping every
  position into the bids now — after tax + slippage; bids refill over time, so patient selling does better")
  and, when `liq.sold < liq.units`, a "(only {sold}/{units} would fill)" note.

## Scope (in)
- `packages/ui/src/game.ts`: `liquidateNow` helper
- `packages/ui/src/components/PositionsPanel.tsx`: the "cash out now" header figure (+ import liquidateNow)
- `packages/ui/test/app.test.tsx`: pin liquidateNow (sum net, sold<units, empty, no-bids-item) + a header render test

## Scope (out)
- No per-row liquidation figure (header aggregate is the headline; rows stay lean); no mid-dump bid-refill
  modeling (the snapshot floor is the honest conservative read); no change to the mark-based value/paper (both
  shown — paper-vs-cashable is the point); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/PositionsPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] liquidateNow: net = Σ bidWalk net (per-fill tax), sold<units when bids run dry, 0/0/0 on empty — pinned
- [ ] PositionsPanel header renders "cash out now ≈X"; partial-fill note when sold<units
- [ ] UI suite (+~2) + e2e (13) green; typecheck clean
- [ ] UI-only — display read of world.books; no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — bidWalk is verified (18p) for per-fill tax + own-order skip; this sums it across positions.
