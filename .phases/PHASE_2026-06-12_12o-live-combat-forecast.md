# Phase: Exchange Wars — Phase 12o: Live In-Combat Forecast (Brick 119)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG — instrument the in-fight push/flee decision)
**Goal:** During a fight, show a live read at the CURRENT hp — ≈rounds to finish the foe vs ≈rounds for it to finish you, with a winning/flee verdict. UI-only, live on main.
**Done condition:** live forecast in the combat view from current hp, counting dragonfire when no antifire; pure helper extended + tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12j forecasts the exchange at the EMBARK screen (full hp). Once a fight is underway, "push or flee?" had no aid — you watched two hp bars and guessed. The live forecast answers it at the current hp, so a losing race is visible before it's fatal.

## Accuracy — making it safe to trust
The embark forecast could afford to gloss dragonfire (it's a rough pre-estimate). A LIVE flee-decision aid can't: under-estimating incoming damage in a dragon fight is exactly the dangerous failure. So this counts dragonfire's `+ceil(atk/2)/round` when no antifire holds. I extended `combatForecast` with an optional `foeHitBonus` (default 0, so 12j's call is untouched) rather than forking the logic — single source, both callers tested. Two things deliberately ignored, with reason: (1) leech (abyss) drains LOOT gp, not hp, so it's irrelevant to the survival race; (2) the roll variance — it's still an estimate (≈), the mean is the right central read. Stats mirror the engine exactly: `deriveStats(pack, lvls) + exp.boost` (commands.ts:237), and antifire from `exp.combat.antifire`.

## Outcome
- `game.ts`: `combatForecast(you, foe, foeHitBonus = 0)` — new optional flat per-round foe-damage term; rounds-to-fall divides by `expectedHit(...) + foeHitBonus`.
- `ExpeditionPanel.tsx`: in the combat branch, a live forecast line under the hp readout — "≈N hits to finish it · it downs you in ≈M · winning the race / flee?" (green/red), at current hps, with the dragonfire bonus folded in.
- Tests (+1): `combatForecast` with a foe-hit bonus shortens rounds-to-fall but not rounds-to-kill. The combat render itself is exercised by the embark e2e (which fights), 333/333 unit, 9/9 e2e. FINDINGS #153.

## Gates
- [x] `foeHitBonus` shortens rounds-to-fall only (pure test)
- [x] Combat render intact (expedition e2e fights)
- [x] Typecheck + 333 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Backport the dragonfire term into the EMBARK forecast (it currently glosses it) — needs the region's dragonfire flag + the planned antifire in the loadout.
