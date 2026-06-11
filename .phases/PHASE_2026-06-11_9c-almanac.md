# Phase: Exchange Wars — Phase 9c: The Almanac (Brick 29)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (the Hall was the thin room; the ledger was the untapped display source)
**Goal:** A records panel for the Hall: the realm's figures (trades, offers placed/rejected, events, contracts, NPC bailouts, gp/items minted vs burned from the audited ledger) and your saga (levels + max hp, kills with elite stars, bestiary progress, caches/dice, deepest tread, deaths, deeds done).
**Done condition:** panel shipped + guide line + render test; suite + e2e green. **MET.**

## Outcome
- AlmanacPanel (pure display, ~100 lines, zero engine change) under the Clerk's Counter in the Hall; honest tooltips on bailouts and the ledger line.
- Guide's rooms line mentions the almanac (8x rule).
- 179/179 unit; 9/9 e2e. No fn redeploy (engine untouched). FINDINGS #63: #56's "book everything → display is free" pattern is now a law (second instance).

## Gates
- [x] Zero engine change (display-only)
- [x] Suite + e2e green; guide updated
