# Phase: Exchange Wars — Phase 9r: Fix the Clobbered Monster Transform (Brick 44, Jesse-reported)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Fixer (Jesse screenshot: monster a clipped blob top-left, not on the right)
**Goal:** The 9l combat scene's CSS bob-animation `transform` clobbered the monster's SVG positioning `transform` attribute (CSS wins, no compose), snapping it to (0,0). Nest the animated group inside the positioned group so they compose; strengthen the test to assert position, not just presence.
**Done condition:** monster positioned right; regression test on the positioning transform; suite + e2e green. **MET.**

## Outcome
- CombatScene: outer `<g transform="translate(160 …) scale(big)">` (attribute) wrapping inner `<g className="monster">` (CSS bob). styles.css comment updated.
- Test strengthened: monster's parent group `transform` contains `translate(160` (catches the snap-to-origin regression).
- 191/191 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #78.

## Gates
- [x] Monster positioned (structural test on the transform)
- [x] Suite + e2e green
