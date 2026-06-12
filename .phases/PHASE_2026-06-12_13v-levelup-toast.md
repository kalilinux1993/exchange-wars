# Phase: Exchange Wars — Phase 13v: Combat Level-Up Celebration (Brick 152)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG juice; the most basic progression feedback was missing)
**Goal:** Pop a celebration toast the moment a combat skill levels up.
**Done condition:** Attack/Defence/Hitpoints level-ups fire a toast; lazy-init so save-load doesn't phantom-fire; suite + e2e green. **MET.**

## Why this brick
Fresh, game-feel surface (combat, barely instrumented). The game celebrates deeds and new daily records, but NOT the most fundamental RPG moment — leveling a skill. `onLevel` in App is about order-book PRICE levels, not combat; combat xp ticked up silently. Seeing "⚔ Attack up!" is core positive reinforcement for the progression loop.

## Design — diff-detection + setToast, mirroring death-capture / daily-record
- `leveledUp(prev, now)` (game.ts, pure): the skills that rose between two level snapshots, with name/glyph/new-level. Empty when nothing rose (or a skill somehow dropped). Unit-testable.
- App: a `prevLevels` ref (lazy null-init so loading a save with existing levels doesn't phantom-fire), checked in `refreshProgress` (which runs after every command, tick, and fast-forward → catches all xp-gain paths). Fires BEFORE the milestone toast, so a deed earned the same tick still wins the single toast slot (priority: fills < level-up < milestone < alerts).

## Outcome
- `game.ts`: `leveledUp` + `LevelUp` interface + `COMBAT_SKILLS`.
- `App.tsx`: `prevLevels` ref + level-up detection in `refreshProgress`.
- Tests (+3): `leveledUp` (lists risen skills + new level; empty on no-change/drop) + an App render test (Attack 1→2 fast-forward fires a "Attack up" toast).

## Gates
- [x] leveledUp lists risen skills; level-up toast fires on a real jump (unit + render)
- [x] UI suite (274, +3) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Notes
- Test learning: a big level jump (→15) crossed a combat-level DEED, whose milestone toast (fired after the level-up in the slot) overrode it — the render test uses Attack 1→2 (combat level unchanged) to isolate the level-up toast. That override order is intentional (deeds outrank a single level-up).

## Follow-ups
- A level-up could also flash the CharacterPanel skill cell, not just toast.
