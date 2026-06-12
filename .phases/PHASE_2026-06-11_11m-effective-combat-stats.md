# Phase: Exchange Wars — Phase 11m: Effective Combat Stats (Brick 91)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (HUD — the player's side of the embark comparison)
**Goal:** Show the player's effective Attack/Defence (levels + equipped gear, via deriveStats) on the character sheet, so it's directly comparable to a region's danger (11l). UI-only, live on main.
**Done condition:** an "in battle: ⚔X 🛡Y" line from `deriveStats(inventory, levels)`; suite + e2e green. **MET.**

## Outcome
- `components/CharacterPanel.tsx`: import `deriveStats`; `const eff = deriveStats(agent.inventory, lvls)`; render `in battle: ⚔{eff.atk} 🛡{eff.def}` (`.effstats`) after the skills strip. Reads the exact engine function combat uses (no re-derivation), on the same inventory-best-gear basis as the equiplist.
- Pairs with 11l: region danger (their worst foe) vs in-battle (your best-gear effective) — same units, side by side, no verdict.
- Tests: extended the CharacterPanel render to assert the "in battle:" line renders and `.effstats` matches `⚔\d+ 🛡\d+`. 258/258 unit, 9/9 e2e. No engine change, no fn redeploy. FINDINGS #125.

## Gates
- [x] Effective stats line renders from deriveStats (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
