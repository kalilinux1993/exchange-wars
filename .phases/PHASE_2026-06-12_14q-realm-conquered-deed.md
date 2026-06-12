# Phase: Exchange Wars — Phase 14q: "Realm Conquered" Milestone (Brick 173)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — progression/milestones)
**Goal:** Give the conquest loop a capstone reward — a tracked deed, earned when EVERY
region's native roster has been fully slain, with an X/8-regions progress bar.
**Done condition:** A "Realm Conquered" milestone exists, achieves only when all regions
are mastered, shows progress as regions-mastered/total; suite + e2e green.

## Why this brick
14n made "which foes remain per region" visible, and the ConquestPanel already counts
fully-conquered regions — but there was no DEED for finishing them all (only "Monster
Scholar" for every individual monster, a subtly different bar). The capstone closes the
conquest loop: a concrete, trackable end-goal with a payoff in the Hall of Deeds. Fresh
subsystem (progression) after the market brick (14p).

## Design — one milestone, modeled on Monster Scholar
- Add to the `MILESTONES` array (game.ts) right after `monster-scholar` (thematic sibling):
  ```
  id: 'realm-conquered', name: 'Realm Conquered',
  achieved: g => REGIONS.every(r => regionMastery(r, g.world.stats.killsByMonster).done),
  progress: g => (# regions done) / REGIONS.length,
  ```
- Reuses `regionMastery` (the ConquestPanel's exact done-logic, already pure in game.ts) so
  the deed and the panel can never disagree about what "mastered" means. Needs `REGIONS`
  added to the engine import.

## Why this is UI-only / not replay-affecting
Milestones live on `Game` (the UI wrapper), latched by `checkMilestones` in the UI; the
leaderboard verifier (`replay.ts`) and `hashState` only read `WorldState`. Adding a deed
changes no engine state, no score, no hash — no engine.js rebuild, no verify-score redeploy.

## Scope (in)
- `game.ts`: the milestone entry + `REGIONS` import
- `app.test.tsx`: a unit-style test driving `achieved`/`progress` from killsByMonster

## Scope (out)
- No engine change, no new "mastered" definition (reuses `regionMastery`)
- No per-region or mid-tier conquest deeds (capstone only; tiers deferred)

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/test/app.test.tsx

## Gates
- [ ] `achieved` false until ALL regions mastered, true once every region's roster is slain
- [ ] `progress` = regions-done / total (partial credit)
- [ ] UI suite + e2e green; typecheck clean
- [ ] UI-only — no engine change, no engine.js rebuild, no redeploy

## Open questions
- None — pure composition over `regionMastery` + the existing milestone machinery.
