# Phase: Exchange Wars — Phase 11f: Order-Book Liquidity Bar (Brick 84)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading microstructure — surface exit/entry liquidity)
**Goal:** Show the resting-book depth (bidDepth/askDepth) in the ticket as an exit/entry liquidity bar — the signal the bots already use, given to the player. UI-only, live on main.
**Done condition:** pure `depthSplit` with tests; a proportioned bar + exact numbers in the ticket; suite + e2e green. **MET.**

## Outcome
- `components/TradeTicket.tsx`: `depthSplit(bid, ask)` → `{bidPct, askPct}` or null (empty book). Renders a `.depthbar` (bid=rise green = exit, ask=fall red = entry) under a "book: N bid · N ask" line, after the flip line. Reads `market.bidDepth`/`askDepth` already on the view.
- `styles.css`: `.depth`/`.depthbar`/`.dseg.bid`/`.dseg.ask`.
- Tests: pure `depthSplit` (50/50, 75/25, 100/0, 0/100, empty→null) + a render that fast-forwards seed 42 by 1000 ticks and asserts `.depthbar` exists (book deterministically has depth). 252/252 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #118.

## Context
- Back on `main`/live; the Field Forge engine content (brick 83) sits in PR #1 awaiting merge + `supabase functions deploy`. Policy: live UI → main; replay-affecting content → PR.

## Gates
- [x] depthSplit proportions + null-when-empty (pure tests)
- [x] Bar renders once the book has depth (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
