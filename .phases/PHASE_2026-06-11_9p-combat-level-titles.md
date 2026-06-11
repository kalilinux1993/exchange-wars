# Phase: Exchange Wars — Phase 9p: Combat Level & Titles (Brick 42)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (OSRS-flavored identity from data already kept)
**Goal:** A derived combat level (floor((atk+def+hp)/3), 1→99) and a worn title chosen from earned deeds, both on the character panel header. Pure derived/UI — no engine mutation, no replay impact.
**Done condition:** combatLevel helper + panel header (level + title select) shipped with tests; suite + e2e green. **MET.**

## Outcome
- quest.ts combatLevel(xp) — pure derived; engine test asserts fresh=1 / maxed=99 / monotonic (caught an off-by-one).
- CharacterPanel header: ⚔ Combat Lv N + a title <select> of earned deed names (localStorage 'ew-title', guarded to earned-only); ExpeditionPanel passes the earned titles from game.milestones×MILESTONES.
- NOT-redeploy recorded (FINDINGS #76): pure display helper, no command/RNG change → replays byte-identical, verify-score untouched.
- 190/190 unit (engine combat-level + UI panel test); 9/9 e2e. No fn redeploy.

## Gates
- [x] combatLevel endpoints + monotonic (engine test)
- [x] panel shows level + earned titles (UI test)
- [x] Suite + e2e green; no replay impact (no redeploy)
