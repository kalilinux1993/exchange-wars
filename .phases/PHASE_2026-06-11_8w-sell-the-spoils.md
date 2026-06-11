# Phase: Exchange Wars — Phase 8w: Sell the Spoils (Brick 23)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (UX brick — close the raid→market loop's last friction)
**Goal:** One-click liquidation: bidWalk (game.ts) computes the walkable quantity against resting bids excluding the player's own; selling at the walk's FLOOR price fills the whole stack instantly — no residue, no slot. Per-row "sell" chips + a "sell the spoils" sweep in the Ledger panel; satchel valuations switch from lastPrice to bids-pay reality. Plus the Monster Scholar deed (full bestiary).
**Done condition:** chips + sweep shipped with a fills-instantly/no-residue test; valuations consistent with the honest mark; suite green. **MET.**

## Outcome
- bidWalk helper (display-side world read; sales via normal place commands — logged, replayable, leaderboard-legal).
- PlayerPanel: per-row sell chips, sweep button, "satchel, as the bids see it" valuation — purse, satchel, and verifier now speak one number (FINDINGS #57).
- Monster Scholar deed with progress.
- 175/175 (new test: 2-level bid walk pays 3,700 exactly, stack emptied, gp up net-of-tax, zero resting orders). Pure UI — engine untouched, no fn redeploy needed.

## Gates
- [x] Sale fills instantly with no resting residue (tested: openOrders 0 after dump)
- [x] Valuation = the honest mark's arithmetic (same bid walk)
- [x] Suite green
