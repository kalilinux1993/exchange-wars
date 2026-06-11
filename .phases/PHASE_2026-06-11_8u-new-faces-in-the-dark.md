# Phase: Exchange Wars — Phase 8u: New Faces in the Dark (Brick 21)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (content brick — event variety from the queued idea pile)
**Goal:** Region-flavored choice events joining shrine/dice: PORTAL (hop one region past your right — depth tourism, badge counts it, no unlock), IMP (no-stake gamble: minted pouch or a depth-scaled snare that can kill), MERCHANT (shark at 3× base — gp burn + item mint, deep-field resupply). Depth-gated spawn pool, one RNG draw like the old 50/50.
**Done condition:** three events shipped engine+UI with conservation tests both branches; e2e text net widened; suite + measure + fn redeploy. **MET.**

## Outcome
- EventState kind union + IMP_PRIZE/MERCHANT_MARKUP (quest.ts); depth-gated pool + prompts and three resolver branches (commands.ts); UI accept-label map; e2e regex widened.
- All conservation-clean via the existing mint/burn vocabulary; portal explicitly does NOT advance questProgress (tourism ≠ progression, tested).
- 173/173 (new multi-branch event test incl. pauper-merchant no-op); audit band stable 5k–215k (routes re-rolled — event pool changed stream consumption, expected); fn redeployed (76.5kb). FINDINGS #55.

## Gates
- [x] Both branches of every event conserved (ok() helper runs checkInvariants per command)
- [x] Suite green; fn rebuild + redeploy
- [x] Audit re-measured (no printer; harness doesn't even use the new events — players explore the ceiling)
