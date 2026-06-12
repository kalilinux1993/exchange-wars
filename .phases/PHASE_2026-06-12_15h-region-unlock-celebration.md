# Phase: Exchange Wars — Phase 15h: "New Frontier Unlocked!" Celebration (Brick 190)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — progression / celebration)
**Goal:** Celebrate the moment you clear the frontier and unlock a new region — a "🗺 New
frontier unlocked!" toast — the progression-JUICE counterpart to the level-up (14e) and
best-haul (15e) celebrations.
**Done condition:** When `questProgress` advances (a region unlocks), a one-time toast names the
newly-opened region; suite + e2e green.

## Why this brick
Unlocking a new region (clear `REGION_CLEAR_KILLS` in one frontier dive → `questProgress`
advances → the realm map opens a node) is a genuine milestone, but nothing marks the moment — the
map just quietly changes. A toast turns it into the satisfying "you've pushed deeper" beat. Fresh
subsystem (progression JUICE) after a market run. Verified novel: no region-unlock celebration
exists; the only related thing is the per-threshold "Frontier Pioneer" milestone (fires once at a
depth, not on every unlock).

## Design — mirror the level-up baseline, in refreshProgress
- `questProgress` updates SYNCHRONOUSLY in the dive-clearing command, so (unlike a delve record)
  `refreshProgress` sees it the same tick — the level-up-style baseline-in-refreshProgress is the
  RIGHT place (cf. 15e, where the delve was appended later so detection moved to `onDelveEnd`).
- A `prevProgress` ref, re-baselined on the SAME game-swap guard as the level baseline
  (`levelBaselineGame.current !== game`), so a cloud-adopt / restart with a deeper save doesn't
  false-fire. When `prog > prevProgress` (and not the baseline), toast naming `REGIONS[prog]`.

## Scope (in)
- `App.tsx`: a `prevProgress` ref + region-unlock detection folded into the existing level-up if/else
- `app.test.tsx`: an integration test (advance `questProgress`, refresh → the toast fires; baseline/swap doesn't)

## Scope (out)
- No engine change; no change to the in-dive "N/3 to unlock" progress readout (it stays); no
  map-node flourish beyond the existing 14t flash

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] advancing `questProgress` 0→1 fires "🗺 New frontier unlocked!" naming the new region (the baseline-latch render doesn't)
- [x] UI suite (333, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Toast priority: if a depth-milestone fires the same tick it may override the unlock toast — acceptable
  (both are celebrations; the unlock shows on the common case where no milestone coincides).
