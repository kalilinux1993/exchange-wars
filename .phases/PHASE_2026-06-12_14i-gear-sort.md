# Phase: Exchange Wars — Phase 14i: GearManager Upgrade-First Sort (Brick 165)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — polish the just-shipped equipment manager)
**Goal:** Order the Adventure-tab GearManager's owned gear most-actionable-first.
**Done condition:** owned gear sorts by biggest wearable upgrade first, locked last; suite + e2e green. **MET.**

## Why this brick
14h shipped the equipment manager. With a full satchel, the items worth equipping should be at the top, not buried — so the player sees their best available upgrade at a glance.

## Design — sort by the upgrade verdict
- Precompute `gearDelta` once per owned piece (was per-row), then sort: usable pieces before locked (under-level sinks), then by `delta` descending (biggest gain first), then by name. Render consumes the precomputed `{item, gd}`.

## Outcome
- `GearManager.tsx`: precompute + sort; render destructures `{item, gd}`.
- Tests (+1): three weapons (atk 50/45/16) into an empty slot render in that order (Dragon → Rune 2h → Rune dart).

## Gates
- [x] biggest upgrade first, locked last (render test); 3 prior GearManager tests intact
- [x] UI suite (289, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- Group by slot (weapon/armor) if the list grows long; a paperdoll grid for the equipped section.
