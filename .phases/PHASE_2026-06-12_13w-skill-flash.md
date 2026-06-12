# Phase: Exchange Wars — Phase 13w: Skill-Cell Level-Up Flash (Brick 153)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG juice; completes 13v's level-up feedback)
**Goal:** Flash the CharacterPanel skill cell that just leveled, OSRS-style.
**Done condition:** the leveled skill cell pulses gold on level-up; lazy-init so opening the sheet doesn't flash; suite + e2e green. **MET.**

## Why this brick
13v added the level-up TOAST (the App-level notification). The natural completion: confirm it WHERE it happened — a brief gold pop on the skill cell, OSRS-style. The toast tells you, the flash shows you which skill. Combat (xp gain) runs on the Adventure tab where CharacterPanel lives, so the flash fires exactly where the player is watching during a dive.

## Design — diff-detection in the component, reuse leveledUp
- A `prevLvls` ref (lazy null-init so opening the sheet on an already-leveled character doesn't flash) + a `flash` state, compared in a `useEffect` keyed on the three levels. On a rise (via the shared `leveledUp` helper), set the risen skills' flash for 1.2s.
- The skill cell takes a `flash` class → a gold `@keyframes skillpop` (bright fill + glow fading to transparent). Reuses `leveledUp` so the flash and the toast agree on what counts as a level-up.

## Outcome
- `CharacterPanel.tsx`: `prevLvls` ref + `flash` state + the `useEffect`; conditional `flash` class on the skill cell.
- `styles.css`: `.skillcell.flash` + `@keyframes skillpop`.
- Tests (+1): rerendering CharacterPanel with Attack 1→5 adds `.skillcell.flash` (first render = baseline, no flash).

## Gates
- [x] skill cell flashes on a level rise, not on first mount (render test)
- [x] UI suite (275, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- Level-up feedback is now complete (toast + skill flash). Could add a one-time combat-level-up fanfare distinct from a single skill.
