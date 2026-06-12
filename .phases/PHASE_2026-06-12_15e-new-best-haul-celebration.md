# Phase: Exchange Wars — Phase 15e: "New Best Haul!" Celebration (Brick 187)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — retention / celebration)
**Goal:** Celebrate the moment a dive beats your previous biggest banked haul — a "🏆 New best
haul!" toast — pairing the 15d static record with a live notification (record + notify, like
the level-up flash + toast).
**Done condition:** Extracting with more loot than any prior survived dive fires a one-time toast
naming the gp + region; deaths and non-beating dives don't; suite + e2e green.

## Why this brick
15d added the static "Best single haul" record but nothing tells you AT THE MOMENT you set a new
one — the satisfying beat goes unmarked. A toast on a new best is the raid-side counterpart to the
level-up celebration (14e) and daily-record celebration (14f). Verified novel: no best-haul toast
exists (the only "new best" is the Sprint leaderboard, a different system).

## Design — detect at the append point, no baseline ref needed
- The timing insight: a delve is latched by `onDelveEnd` AFTER `refreshProgress` runs, so the
  level-up-style baseline-in-refreshProgress would miss the just-ended dive. Instead detect IN
  `onDelveEnd`, comparing the new record to the prior best — the natural, race-free place. No
  identity-keyed baseline / swap-guard needed (onDelveEnd fires only on a real dive-end, never on a
  game swap).
- `isNewBestHaul(priorDelves, record)` (game.ts, pure): true iff the record SURVIVED and beat the
  best banked haul among the PRIOR dives (`diveRecords(prior).bestHaul`). The first survived dive
  sets the bar silently (no prior to beat) — celebrate only a genuine improvement, not a trivial
  first 10-gp run.
- App `onDelveEnd`: compute `isNewBestHaul(game.delves, record)` BEFORE pushing, then toast
  "🏆 New best haul! — {gp} gp from {region}" if true.

## Scope (in)
- `game.ts`: `isNewBestHaul`
- `App.tsx`: detect + toast in `onDelveEnd` (+ `REGIONS`/`regionIndex` import for the region name)
- `app.test.tsx`: `isNewBestHaul` unit (died / first / beat / not-beat)

## Scope (out)
- No engine change; no celebration for `mostKills` (haul is the headline peak); no confetti/sound

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `isNewBestHaul`: died→false; first survived (no prior)→false; survived beating prior(800→1200)→true; not-beating(500)→false
- [x] UI suite (328, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- The App-side toast wiring is covered by the pure helper test + trivial 3-line integration (the
  toast call is exercised by the existing dive-end flow) — honest coverage accounting.
