# Phase: Exchange Wars — Phase 18w: Realized P&L nets the sell tax PER FILL (cheap-flip overstatement) (Brick 283)

**Started:** 2026-06-13
**Hat:** Reviewer → Builder (reference-verify: the realized-P&L money path)
**Goal:** The FIFO trade book (`applyFillToBook`) and the trade journal (`recentFlips`) net the sell tax
**per unit** (`f.price − floor(f.price·rate)`), which floors to **ZERO tax for any price < 50** (at 2%). So
cheap-staple flips — the core "cheap staples are everyone's" loop — book NO tax and overstate realized
profit by the full ~2% of turnover. Fix: net the sell tax PER FILL on the matched units
(`floor(f.price·matched·rate)`), matching the engine's `paySeller` (exchange.ts) exactly for a full match.
**Done condition met:** yes — realized P&L / trade journal net tax per-fill; a cheap flip (sell 100 @ 33)
now books the engine's 66-gp tax instead of 0; suite + e2e green.

## Why this brick
Continuing the reference-verify seam (18g/18o/18p), I checked the realized-P&L money path. It DOES net tax —
but per UNIT, `floor(f.price·rate)`, which is 0 whenever `f.price·0.02 < 1` (price < 50). The engine taxes
per FILL: `floor(price·qty·rate)` (paySeller, called once per trade). For a cheap-staple flip — sell 100 @
33: engine tax `floor(33·100·.02)=66`, but per-unit `floor(33·.02)·100 = 0·100 = 0` — the trade book shows
+300 profit when the player actually netted +234 (a 22% overstatement). This isn't rounding; it's the WHOLE
tax vanishing below price 50, and cheap staples are the bread-and-butter flip. So the realized panel, the
trade journal, the lifetime P&L, and the scorecard all overstate cheap-flip profit. Same class as bidWalk
(18p) but bigger, and on the primary gameplay loop. (`recentFlips` already accumulates `matched`/`buyCost`;
`applyFillToBook` books per-lot inline — both just need the fill-level tax.)

## Design — per-fill tax on the matched units
- `game.ts` `applyFillToBook` (sell branch): accumulate `matched` + `buyCost` over the FIFO lot match (don't
  book per-lot), then once: `acc.profit += (f.price·matched − Math.floor(f.price·matched·taxRate)) − buyCost;
  acc.soldUnits += matched`. Exact match to the engine for a fully-matched sell; for a partial match
  (selling loot beyond buys), taxes the matched (flip) portion per-fill — the unmatched loot isn't a flip.
- `game.ts` `recentFlips`: same — `profit: (f.price·matched − Math.floor(f.price·matched·taxRate)) − buyCost`
  (drop the now-unused per-unit `proceeds`).

## Scope (in)
- `packages/ui/src/game.ts`: per-fill sell tax in `applyFillToBook` + `recentFlips`
- `packages/ui/test/app.test.tsx`: update any realized/flip value pinned to the old per-unit tax; add a cheap-flip (<50) regression (tax now booked)

## Scope (out)
- Buys stay untaxed (tax is sell-side); no engine change (it's already per-fill correct); no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/test/app.test.tsx

## Gates
- [x] `applyFillToBook` + `recentFlips` net tax per-fill; a cheap flip (100 @ 33) now books 66 tax → +234, not the per-unit +300
- [x] full-match profit == engine net (sell 10@120 → 176, not 180); 4 P&L tests corrected to the engine-accurate values + a cheap-flip regression added
- [x] UI suite (453) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — verified vs paySeller (exchange.ts:73/166); full-match equals the engine exactly.
