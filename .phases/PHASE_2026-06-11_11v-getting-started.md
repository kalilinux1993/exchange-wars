# Phase: Exchange Wars — Phase 11v: Getting Started checklist (Brick 100)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (onboarding — prospective new-player guidance)
**Goal:** A self-checking "Getting Started" first-steps list for new players (trade → clerk → delve → sprint horizon), auto-hiding once done. UI-only, live on main.
**Done condition:** pure `firstSteps` derived from game state; panel auto-hides when complete or dismissed; suite + e2e green. **MET.**

## Outcome
- `components/FirstSteps.tsx`: pure `firstSteps(game, view)` → 4 steps with `done` from real state (`fills.length`, `view.upgrades.autoFlip`, `stats.monstersSlain`, `world.tick >= SPRINT_TICKS`). `FirstSteps` renders ✓/○ + a `usePref`-persisted dismiss; returns null when all done or dismissed.
- `App.tsx`: first panel in the Exchange room (the landing room) — reference, not modal.
- `styles.css`: `.firststeps .step` left-aligned check+label.
- Tests: pure `firstSteps` (fresh → all undone; all-done via real `applyCommand buyUpgrade autoFlip` → all done) + render (shows for new players, hides on dismiss, hidden when all done). 273/273 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #134.

## Gates
- [x] firstSteps derives done-ness from state; all-done via the real command path (pure tests)
- [x] Panel shows for new players, hides when done/dismissed (render tests)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
