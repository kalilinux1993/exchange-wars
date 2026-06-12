# Phase: Exchange Wars — Phase 16k: Shareable Run Brag (Brick 219)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — social / viral retention)
**Goal:** A "📋 brag" button that copies a one-glance summary of your run — combat level, net worth, best
dive haul, survival streak, deeds — plus a challenge link to the same seed, so a player can share "here's
what I did, beat me on this exact world": the growth loop a leaderboard game wants.
**Done condition:** The button copies a formatted brag (stats + challenge link) to the clipboard with a
confirm toast (clipboard API + prompt fallback, the `copyChallenge` pattern); suite + e2e green.

## Why this brick
The game has a leaderboard (two-tense, 16a/16b) and challenge links (#seed) but no way to SHARE a result —
the one social affordance a competitive game grows on. `copyChallenge` already shares the seed; a brag adds
WHAT YOU DID on it (the stats that make someone want to beat you) to that link. Fresh, non-trading,
non-band work after a long run (the last several bricks were band/adventure/save-flow); reuses the proven
clipboard pattern and the stat helpers (`diveStreak`/`diveRecords`/`combatLevel`) already built — near-zero
new surface, a real forward-looking retention feature.

## Design — a pure formatter + a copy action beside the challenge button
- `game.ts`: `bragText(game, worth, origin, pathname)` → a 2-line string: "⚔ Exchange Wars — combat N ·
  {worth} gp · best haul X · M-dive streak · K deeds\nBeat me on seed S: {origin}{pathname}#seed=S". Pure
  (origin/pathname injected, no `window`); omits empty stats (no deeds → no "0 deeds"). Adds `combatLevel`
  to the engine import.
- `App.tsx`: `copyBrag` mirrors `copyChallenge` (navigator.clipboard → prompt fallback → confirm toast); a
  "📋 brag" chip next to the existing "challenge link" chip (both share affordances, grouped).

## Scope (in)
- `game.ts`: `bragText` (+ `combatLevel` import)
- `App.tsx`: `copyBrag` + the brag chip
- `app.test.tsx`: `bragText` unit (contains the seed link, combat level, the game title)

## Scope (out)
- No image/card render (text is shareable everywhere; an image card is a bigger, later thing); no auto-share;
  no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `bragText` includes the game title, combat level, net worth, and the `{origin}{pathname}#seed=S` challenge link; omits empty stats (no "0 deeds")
- [x] the brag chip copies it (clipboard API → prompt fallback) + a "Run summary copied" toast
- [x] UI suite (368, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `copyChallenge`'s pattern + existing stat helpers.
