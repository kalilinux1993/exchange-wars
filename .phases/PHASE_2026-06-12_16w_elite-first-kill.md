# Phase: Exchange Wars — Phase 16w: Elite first-kill celebration (Brick 231)

**Started:** 2026-06-12
**Hat:** Builder (player feel — salute the rare boss kills)
**Goal:** The first time you fell each named elite (Skarn, Vorkanth, Zukrath, Vessith), fire a "☠ {elite}
falls!" toast. Four bosses, four once-per-game salutes — the deep-tier payoff deserves a moment.
**Done condition:** Landing the killing blow on an elite you've never slain fires the toast once; re-killing
it (or reloading a save where it's already in your Bestiary) is silent; suite + e2e green.

## Why this brick
The named elites are the rarest kills in the game — 4 bosses gated behind the deep regions, ~10% spawn
chance in their home region, jackpot loot. Yet felling one for the first time passes in silence; the
Bestiary records it but nothing marks the moment. A first-kill salute (like the level-up / region-unlock
celebrations) gives the deep-tier grind its earned beat. Pivoting back to Adventure after a run of
social/duel bricks — breadth over depth.

## Design — pure helper + baseline-guarded detection in refreshProgress
- `game.ts`: `ELITES` (the elite roster `{id,name}` from MONSTERS) + `newElites(slain, kills)` — pure: the
  elites with `kills>=1` not yet in the `slain` baseline, in encounter order. Caller owns the Set.
- `App.tsx`: `eliteFired` (Set) + `eliteBaselineGame` (swap-guard) refs. On boot/swap, baseline the Set to
  every elite already in `killsByMonster` (so an elite slain in a PRIOR session / offline is adopted SILENTLY
  — same offline-silent rule as the level baseline; the Bestiary already records it). In `refreshProgress`,
  fire `☠ {name} falls!` for each `newElites(...)` and add it to the Set. Placed among the celebrations,
  before the deed/duel (those rarer/meta moments still win the slot if they coincide).

## Scope (in)
- `game.ts`: `ELITES` const + `newElites` helper
- `App.tsx`: `eliteFired`/`eliteBaselineGame` refs + detection block in `refreshProgress`
- `app.test.tsx`: `newElites` unit (baseline absorbs prior kills; fresh kill surfaces; order) + a live-kill
  render test (delve kill fires "falls!", reload is silent)

## Scope (out)
- No engine change (the `eliteSlain` aggregate stat + `killsByMonster` tally already exist) — no redeploy
- No offline-fire (consistent with level/region; the duel is the only offline-settled celebration)
- No new milestone/deed (the Bestiary + `eliteSlain` stat already chronicle it)

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `newElites` pure; baseline-on-boot absorbs prior kills silently; live kill fires once (4 units + a render test)
- [x] UI suite (387, +5) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the level-up celebration's baseline+swap-guard+fired-set pattern exactly.
