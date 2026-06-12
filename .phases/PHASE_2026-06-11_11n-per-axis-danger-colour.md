# Phase: Exchange Wars — Phase 11n: Per-Axis Danger Colour (Brick 92)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (HUD — finish the embark comparison with a colour cue)
**Goal:** Colour the region danger's foe stats relative to your effective stats (red when the foe's stat beats yours), per axis — a survival cue without a survival verdict. UI-only, live on main.
**Done condition:** foe ⚔/🛡 coloured green/red vs your deriveStats; test pins the rule; suite + e2e green. **MET.**

## Outcome
- `components/ExpeditionPanel.tsx`: the danger line now splits the foe's ⚔ and 🛡 into separate `<b>` spans; ⚔ red (`down`) iff `foe.atk > eff.def`, 🛡 red iff `foe.def >= eff.atk`, else green (`up`). `eff = deriveStats(agent.inventory, lvls)`. Tooltip shows your in-battle stats + the colour rule.
- Per-axis (not a combined verdict) keeps it honest — no survivability model, just two factual comparisons over numbers already computed (11l danger + 11m effective stats).
- Tests: extended the 11l render — fresh player (eff ⚔5 🛡2) at Lumbridge → goblin ⚔4 is `down` (4 > 2), 🛡1 is `up` (1 < 5). 258/258 unit, 9/9 e2e. No engine change, no fn redeploy. FINDINGS #126.

## Gates
- [x] Foe stats coloured per-axis vs player effective stats (render test pins the case)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
