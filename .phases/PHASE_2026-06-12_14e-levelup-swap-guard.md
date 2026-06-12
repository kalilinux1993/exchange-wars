# Phase: Exchange Wars — Phase 14e: Level-Up Swap Guard (self-found hardening) (Brick 161)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Reviewer→Builder (fix a real edge in my own 13v/13w level-up feature)
**Goal:** A game/agent swap must not fire a false level-up toast or skill flash.
**Done condition:** the level-up toast (App) and skill flash (CharacterPanel) re-baseline on a game/agent swap; suite + e2e green. **MET.**

## Why this brick
Reviewing the session's stateful effects, I found a real edge in 13v/13w: `prevLevels`/`prevLvls` are mount-lazy-init refs that DON'T reset when the game is swapped (cloud-save adoption, restart, challenge link). Adopting a higher-level cloud save would fire a FALSE "⚔ Attack up!" toast (and skill flash) on sign-in — a wrong celebration that undermines the feature's credibility.

## Design — key the baseline to game/agent IDENTITY
The engine mutates the agent IN PLACE on a real level-up (same object reference), so identity distinguishes "leveled up" (ref stable) from "swapped to another save" (ref changes):
- App: `levelBaselineGame` ref; re-baseline `prevLevels` (no toast) when `levelBaselineGame.current !== game`.
- CharacterPanel: `prevAgent` ref; re-baseline `prevLvls` (no flash) when `prevAgent.current !== agent`.

## Outcome
- `App.tsx` / `CharacterPanel.tsx`: identity-keyed re-baseline.
- Tests: the 13w flash test corrected to mutate the SAME agent in place (a new object is a swap, not a level-up — the old test's object-swap simulation was the bug the fix exposes); a NEW test asserts an agent SWAP to a higher level does NOT flash. The 13v App toast test is unaffected (same game across fast-forwards).

## Gates
- [x] real level-up still toasts/flashes (in-place mutation); a swap does not (render tests)
- [x] UI suite (284, +1 net) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Notes
- Same latent class likely affects other mount-lazy refs (daily-record `incomingBest`/`recordCelebrated`) — pre-existing, lower severity (those guard on seed/once-latch); noted, not fixed here.
