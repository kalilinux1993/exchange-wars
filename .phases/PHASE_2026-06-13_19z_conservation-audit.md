# Phase: Exchange Wars — Phase 19z: conservation audit of the expedition-event surface — SOUND (Brick 312)

**Started:** 2026-06-13
**Hat:** Auditor (verify the core conservation invariant on the dive surface; check existing coverage first)
**Goal:** Audit whether every gp/item-spending expedition path books through `state.ledger` (conservation,
CLAUDE.md #4) — the surface the market-sanity sim doesn't exercise (its player is the scripted flipper).
**Done condition met:** yes — SOUND. Mid-audit correction: `expedition.test.ts` ALREADY covers dive
conservation (`checkInvariants` after dives + "choices in the dark" shrine/gamble), so the surface isn't
uncovered; the hand-audit adds verification of the event kinds those tests don't explicitly trigger
(forge/toll/courier/merchant/altar/imp/spar) — all book correctly. Finding logged accurately (incl. the
near-miss of over-claiming the gap); a narrow test follow-up flagged.

## Findings
- All gp leaving `exp.packGp` is booked `gpBurned` (shrine/toll/merchant/forge fees, gamble loss) or MOVED to
  `agent.gp` with the cut burned (courier). All gp/items entering booked `gpMinted`/`itemsMinted`. altar/spar/
  portal touch only hp/xp/region (not conserved — correct). SOUND, no leak.
- Lesson: grep the test suite for the invariant before claiming it's untested — I hand-audited first and
  nearly shipped "only hand-verification," which was wrong (`checkInvariants` already runs on the dive path).

## Scope (in)
- Read-only audit of commands.ts 'choose' + eatFood conservation; FINDINGS + NEXT_STEPS notes.

## Scope (out)
- No code change (sound); the narrow test follow-up (trigger every event + checkInvariants) is logged, not done
  here. No engine change → no redeploy.

## Gates
- [x] every dive gp/item path booked through the ledger — hand-verified SOUND; existing test coverage noted accurately
- [x] docs-only — suite/bundle unchanged

## Open questions
- None — conservation holds on the dive surface; a fuller event-conservation test is logged for later.
