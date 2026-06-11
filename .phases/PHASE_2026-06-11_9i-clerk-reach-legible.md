# Phase: Exchange Wars — Phase 9i: The Clerk's Reach, Made Legible (Brick 35)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (Jesse-surfaced UX gap: "70k coins, why is the clerk buying 2 @ 22?")
**Goal:** Make the clerk's unit-based sizing legible. The Clerk's Counter shows the per-flip ceiling (≤N units/flip · M concurrent · every C ticks · ≤V% vol) and a plain note explaining UNIT cap ≠ bankroll, with a concrete example, what tier 2 unlocks (big staples), and the escape hatch (flip exotics/big positions yourself). Zero engine change.
**Done condition:** panel explains the cap; render test; suite + e2e green. **MET.**

## Outcome
- UpgradeShop: enriched auto-flipper line + dim explanatory note (EXAMPLE_PRICE constant for a concrete ~132 gp figure; tier-aware copy — junior "calm cheap goods only / tier 2 unlocks ≥5k staples" vs senior "~48k a flip on a 6k staple").
- Render test: hire clerk → Hall → note states the cap and the escape hatch.
- 184/184 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #69.

## Gates
- [x] Cap + escape hatch stated in-panel (render test)
- [x] Suite + e2e green
