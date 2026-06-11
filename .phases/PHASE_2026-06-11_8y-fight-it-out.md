# Phase: Exchange Wars — Phase 8y: Fight It Out (Brick 25)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (QoL — kill the 10–30-clicks-per-deep-fight friction)
**Goal:** An auto-resolve button in the combat view: swings until the fight settles, drinks the antifire against breath, eats when below 40% max hp, and HANDS BACK CONTROL if food runs out while below 25% (your call, not the bot's). UI-only — it issues the same logged commands a player would (each round still a tick), so replays and the board are untouched.
**Done condition:** button shipped with a settled-or-safety-stopped test; no e2e role-name collisions (learned from 8w); suite + e2e green. **MET.**

## Outcome
- "fight it out" chip between fight and flee; policy = the audit grinder's combat logic distilled (antifire first, eat at <40%, stop at <25% without food, 100-round guard).
- Name chosen to avoid the exact-match 'fight' locator (8w's lesson applied proactively); local e2e run confirms 8/8.
- 176/176 unit; UI-only, no fn redeploy.

## Gates
- [x] Loop always terminates (guard) and never decides death-risk for the player (safety stop tested)
- [x] Suite + local e2e green (role-name collision checked BEFORE pushing this time)
