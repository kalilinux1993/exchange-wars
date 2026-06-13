# Phase: Exchange Wars — Phase 21d: "take profit" one-click on winning positions (the cut-losers twin) (Brick 322)

**Started:** 2026-06-13
**Hat:** Builder (trading — symmetry: the profit-side complement to the loss-side "cut losers" 14s)
**Goal:** PositionsPanel has a two-tap "✂ cut" that market-sells UNDERWATER positions to stop a loss, but
no equivalent to LOCK a gain on a winner — core flipping discipline (sell into strength before it reverts).
Add a "✓ take" twin, gated honestly on a real after-tax gain.
**Done condition met:** yes — winning rows whose best bid is above break-even (avg cost + 2% tax) get a
two-tap "✓ take" that market-sells the whole position at the bid; gated on `bestBid > breakEvenSell` so it
only offers to lock a REAL gain (not a paper one the spread/tax would eat); mutually exclusive with cut
(shares the `armed` state — a row is a loser XOR a winner); render tests; suite + e2e green; typecheck clean.

## Design
- New block beside the existing cut block: `onCommand && p.marked && p.unrealized >= 0 && bid != null &&
  bid > breakEvenSell(p.avgCost, GE_TAX_RATE)` → "✓ take" → arm → "confirm ✓" → `place sell @ bid, qty=units`.
- Honest gate: keys on the actual `bestBid` net of tax (via `breakEvenSell`), NOT the paper `unrealized`
  (marked at lastPrice) — a position can show green at mark yet sell at a loss after spread+tax. Title
  quotes the locked gain (`bid·units − floor(bid·units·tax) − cost`).
- Reuses `armed` (one row can't be both underwater AND a real-gain winner), so no new state.

## Scope (in)
- packages/ui/src/components/PositionsPanel.tsx (the take-profit block + imports)
- packages/ui/src/styles.css (.chip.take / .chip.take.armed — green, mirroring .chip.cut)
- packages/ui/test/app.test.tsx (take-profit two-tap; no-take when bid below break-even)

## Scope (out — explicit non-goals)
- Auto-selling / trailing stops (engine territory); partial take-profit (whole position only, like cut)
- Changing cut-losers; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/PositionsPanel.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] winner with bid > break-even shows ✓ take; arm→confirm market-sells whole position at the bid
- [x] no ✓ take when bid ≤ break-even (paper gain but no real after-tax gain); cut unchanged
- [x] typecheck clean; UI suite 502 (+2); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- A "🟡 rich" position with no live bid above break-even shows nothing — acceptable (nothing to lock now).
