# Phase: Exchange Wars — Phase 10w: Train-to-Unlock Hints (Brick 75)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (HUD/RPG discoverability — make the stats/xp ladder legible from the character sheet)
**Goal:** Per gear slot, surface a "🔒 train X to N" hint when the player holds a better item they can't wear yet — closing the loop between owning gear and the level gates. UI-only, no engine change.
**Done condition:** pure `lockedUpgrades` (held + level-gated + an upgrade only) with truth-table tests; the hint rendered in CharacterPanel's equiplist; suite + e2e green. **MET.**

## Outcome
- `CharacterPanel.tsx`: exported `equipped` + new `lockedUpgrades(inv, lvls, worn)` — per slot, the highest-scoring held item that's level-gated AND beats the worn piece; reuses the same `(weapon?atk:def) < req` gate as the engine so they can't disagree. Rendered as "🔒 Atk/Def N" with a tooltip naming the item; wraps to its own line in the slot cell.
- `styles.css`: `.lockhint` (amber, `flex-basis:100%` so it never crowds the name); fixed the positional `.equip.on span:last-child` gold rule → `.equip.on .equipval` (classed the value span) so the new third span can't steal the highlight; `.equip` now `flex-wrap`.
- Tests: 2 pure `lockedUpgrades` (surfaces the two gated upgrades, skips the usable helm; yields `{}` at maxed levels) + 1 CharacterPanel render (hints "🔒 Atk 20" / "🔒 Def 12" show). 231/231 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #109.

## Notes
- Op gotcha: a stray early `cd packages/ui/src` drifted the shell cwd → `npm run typecheck` resolved to the ui workspace (missing script). Fix: `cd` to repo root for workspace scripts.

## Gates
- [x] lockedUpgrades surfaces gated upgrades only, skips usable + non-upgrades (pure tests)
- [x] Hints render in the character sheet (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
