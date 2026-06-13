# Phase: Exchange Wars — Phase 19w: a pristine save must never clobber a real cloud save (data-loss fix) (Brick 309)

**Started:** 2026-06-13
**Hat:** Builder (data-integrity — the progress-loss theme: 19d sync feedback → 19r offline → here, cloud merge)
**Goal:** Auditing the cloud-save conflict path found a HIGH data-loss bug. `chooseSave` is latest-wins by
`lastSeenMs`; the adopt flow (App:442-456) adopts the cloud if it wins, else `pushCloudSave(local)` —
OVERWRITING the cloud. So a player who starts a FRESH game on a new device (or after a storage clear) and then
signs in has `local.lastSeenMs = now > cloud` → their pristine empty game wins by recency → it CLOBBERS their
real cloud save. Silent total progress loss — the worst UX. Fix `chooseSave` so a pristine, untouched save
never beats a save with a real run.
**Done condition met:** yes — `chooseSave` treats a save with `world.tick === 0 && commandLog empty` as
untouched and, when exactly one side is untouched, prefers the REAL one (regardless of recency); otherwise
latest-wins as before; tests pin the new behavior + the unchanged latest-wins; suite + e2e green.

## Why this brick
The catastrophic path: real run in the cloud (device A, yesterday) → fresh device B starts a new game
(lastSeenMs=now) → sign in → `chooseSave(freshLocal, cloud)` returns 'local' (newer) → adopt-ELSE pushes the
fresh local over the cloud → the real run is gone. A brand-new untouched game has ZERO progress and ZERO player
intent to discard the cloud, so it must never win by recency. This is the cloud sibling of 19r (offline
data-loss) and continues the "never silently lose the player's progress" theme. Scoped to the UNAMBIGUOUS case
(pristine vs real); the fuzzier "barely-played local vs rich older cloud" stays latest-wins (recency respects an
intentional restart) and is flagged for Jesse as a conflict-policy call.

## Design — an "untouched" guard in chooseSave
- `cloud.ts` `chooseSave(local, cloud)`: after the null checks, `untouched(g) = (g.world.tick ?? 0) === 0 &&
  (g.commandLog?.length ?? 0) === 0`. If `untouchedLocal !== untouchedCloud`, return the NON-untouched side
  (the real run wins). Else fall through to the existing `lastSeenMs` latest-wins (cloud on tie). Pure; the
  adopt flow already routes through chooseSave, so the fix flows for free.

## Scope (in)
- `packages/ui/src/cloud.ts`: the untouched guard in `chooseSave`
- `packages/ui/test/app.test.tsx`: pin pristine-newer-loses-to-real-older (both directions) + the unchanged latest-wins/tie cases

## Scope (out)
- No change to the adopt flow (it already calls chooseSave); no "ask the user" conflict UI; no progress-based
  tiebreak for the barely-played case (latest-wins respects intentional restarts — flagged for Jesse); no
  engine change → no redeploy. (Backend deploy is Jesse-gated, but this client-side fix ships regardless.)

## Subsystems touched
- packages/ui/src/cloud.ts
- packages/ui/test/app.test.tsx

## Gates
- [ ] chooseSave: a pristine save never beats a real run (either side); latest-wins + tie unchanged when both comparable
- [ ] UI suite (+1) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Flagged for Jesse: conflict policy for a barely-played-real local vs a rich older cloud (recency-wins today; "prefer more progress" vs "respect restart" is a product call).
