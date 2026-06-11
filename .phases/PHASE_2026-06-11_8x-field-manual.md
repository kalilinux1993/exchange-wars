# Phase: Exchange Wars — Phase 8x: The Field Manual (Brick 24)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (docs-as-product — the guide teaches the game that now exists)
**Goal:** The help overlay predated 10 systems (stats, wounds, antifire, events, bestiary, sell @ bid, the 7th region) and stated a WRONG sprint length (10k; it's been 2k for ages). Refresh both the in-game guide and the README to match the shipped game; import SPRINT_TICKS into the overlay so that number can never drift again.
**Done condition:** guide + README current; constants imported not hand-written; suite green. **MET.**

## Outcome
- HelpOverlay: rewritten around the full loop — trade ↔ raid, time costs, training/gear gates, fire country + the ticket, the dark's events, bestiary, honest scoring, sprint board with depth badge. SPRINT_TICKS imported (the stale "10k" was a live lie to players).
- README: seven-region ladder, combat training, events/elites/bestiary, honest-scoring bullet; architecture tree gains quest.ts/replay.ts; stale "10 Deeds" count un-pinned.
- 175/175; UI-only, no fn redeploy.

## Gates
- [x] No hand-written copies of engine constants in the guide (SPRINT_TICKS imported)
- [x] Suite green (guide-anchored tests preserved their bold anchors)
