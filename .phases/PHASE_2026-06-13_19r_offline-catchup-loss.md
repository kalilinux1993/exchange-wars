# Phase: Exchange Wars — Phase 19r: don't drop offline time when a catch-up is interrupted mid-flight (Brick 304)

**Started:** 2026-06-13
**Hat:** Builder (review-driven fix — a confirmed offline-accrual data-loss bug)
**Goal:** The offline-subsystem adversarial review confirmed a HIGH bug: `planOfflineProgress` stamps
`lastSeenMs = nowMs` for the FULL debt up front (game.ts:2287), but a LARGE catch-up runs in chunks. If the
tab is hidden mid-catch-up, `onVis`-hidden calls `saveGame` (App:713), which re-stamps `lastSeenMs = Date.now()`
(game.ts:2340) while `world.tick` is only partway — so on reopen the gap measures ≈0 and the UNRUN remainder
(up to the offline cap, ~many hours of accrual) is silently lost. Fix it; also reword the misleading
"policy:'idle'" comment (the Clerk DOES act offline — replay re-derives it, so the wording is a tripwire).
**Done condition met:** yes — `onVis`-hidden skips the save while a chunked catch-up is in flight
(`planRef.current !== null`), so the clean prior save survives and the whole gap re-plans on next boot (the
in-memory partial is recomputed, not lost); the comment states the real invariant; a regression test pins it.

## Why this brick
A confirmed player-value-loss bug (the review's only HIGH). It's narrow (needs a >5,000-tick chunked catch-up
interrupted within its sub-second run by a tab-hide) but the loss is large when hit. The minimal correct fix
turns on one fact: during a chunked catch-up the boot doesn't save and the overlay blocks user commands, so the
ONLY mid-flight save is `onVis`-hidden — guard THAT and nothing persists the half-done state; the next boot
re-plans the full gap from the last clean save (a few seconds of recompute, no loss, no corruption). A hard
crash mid-catch-up was already safe (nothing persisted the partial). The comment reword removes a false premise
a future maintainer could "fix" replay against.

## Design — one guard + a comment reword
- `App.tsx` `onVis` hidden branch: `if (planRef.current === null) saveGame(g);` — `planRef.current` is non-null
  ⟺ a chunked catch-up is pending (set in beginOffline, cleared at finalize/swap-abort), and it's a REF so it's
  current in the empty-deps `onVis` closure. Skipping the save mid-catch-up leaves localStorage at the clean
  prior state → full re-plan on reopen.
- `App.tsx:255-258` comment: rewrite to "offline logs no COMMANDS; the Clerk's actions are deterministic
  engine effects that replay re-runs via identical tickWorld — so replay stays correct" (the true invariant).

## Scope (in)
- `packages/ui/src/App.tsx`: the onVis-hidden save guard + the comment reword
- `packages/ui/test/app.test.tsx`: a regression test — hide mid-chunked-catch-up must not persist a near-now lastSeenMs (the debt stays recoverable)

## Scope (out)
- No persisted-debt field / resumable catch-up (the re-plan-from-clean-state path is correct and simpler); no
  change to `saveGame`'s signature; the cloud-push-during-catch-up edge (a pre-scheduled debounce landing
  mid-flight) is noted, not fixed here (rarer, Jesse/cloud-adjacent); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx (onVis + the offline-comment)
- packages/ui/test/app.test.tsx

## Gates
- [ ] onVis-hidden skips saveGame while planRef.current is set; normal hide (no catch-up) still saves
- [ ] regression test: hide mid-chunked-catch-up → no persisted near-now lastSeenMs (debt recoverable)
- [ ] UI suite (+1) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Cloud push during catch-up (pre-scheduled debounce serializing the partial state to the cloud) — logged for Jesse; rarer than the local reload path fixed here.
