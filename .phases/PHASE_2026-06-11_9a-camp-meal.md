# Phase: Exchange Wars — Phase 9a: The Camp Meal (Brick 27)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (the queued nicety the rooms steer interrupted; closes 8r's scope-out)
**Goal:** eatFood works between fights: time passes (a tick per bite), wounds close up to the trained max, antifire coats the dive BEFORE the fire country. Pending events block the picnic; rejections stay tick-free no-ops.
**Done condition:** camp path shipped with tests (tick cost, heal cap, pre-coat, in-event rejection, conservation); combat path unchanged; suite + e2e green; fn redeployed. **MET.**

## Outcome
- commands.ts: eatFood validations hoisted ahead of all branches (validation-first discipline — FINDINGS #61); camp branch = tick + burn + capped heal + antifire mirror + journal.
- UI: food chips join the venture controls ("a camp meal — time passes while you eat").
- 177/177 unit; 9/9 e2e; fn redeployed (77.4kb).

## Gates
- [x] Rejected camp-eats consume no tick (in-event tested; not-edible/insufficient validated pre-tick)
- [x] Combat eat path byte-identical in behavior (existing tests untouched)
- [x] Suite + e2e green; fn redeploy
