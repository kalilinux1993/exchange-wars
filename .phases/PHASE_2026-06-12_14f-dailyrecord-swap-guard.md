# Phase: Exchange Wars — Phase 14f: Daily-Record Swap Guard (finish the class) (Brick 162)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — fix the sibling of 14e's bug class)
**Goal:** Cloud-save adoption must not false-fire the "New daily record!" celebration.
**Done condition:** the cloud-adoption path re-baselines the daily-record refs (like restart does); suite + e2e green. **MET.**

## Why this brick
14e flagged that other mount-lazy celebration refs likely share its bug class. Verified: the daily-record celebration (12w) resets `incomingBest`/`recordCelebrated` on RESTART (App.tsx:568-569) but NOT on cloud-save adoption — so adopting a daily-seed cloud save whose worth beats the stale local baseline would fire a false "🎉 New daily record!" on sign-in. Same class as 14e, narrower (guarded by the once-latch + daily-seed check), but real.

## Design — mirror the proven restart reset at the cloud-adoption site
- The cloud-adoption effect now resets `incomingBest.current = undefined` + `recordCelebrated.current = false` after `gameRef.current = cloud` — identical to what restart already does, so the daily-record re-captures the new save's record-to-beat and re-arms. (14e's identity-key already covers the LEVEL-UP refs on cloud adoption; the daily-record uses the explicit-reset pattern, so it needs the reset added here.)

## Outcome
- `App.tsx`: 2-line daily-record reset in the cloud-adoption path.

## Gates
- [x] no regression — full UI suite (284) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Honest note
- The cloud-adoption path is gated on a Supabase session + `loadCloudSave`, so it can't be unit-tested in isolation. The fix is a 2-line MIRROR of the already-tested restart reset (568-569); confidence rests on that equivalence + the full suite showing no regression, not a new dedicated test.

## Follow-ups
- The 14e/14f pair closes the known mount-lazy-celebration swap class (level-up, daily-record). Any future "celebrate a change" ref should re-baseline on every game-swap site by construction.
