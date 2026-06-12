# Phase: Exchange Wars — Phase 12j: Embark Combat Forecast (Brick 114)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG — decision-instrument the embark, the adventure analog of the trading cockpit)
**Goal:** Before embarking, forecast the exchange vs the region's hardest foe: ≈rounds to down it vs ≈rounds for it to down you, with a favored/risky verdict. UI-only, live on main.
**Done condition:** forecast line in the embark screen (rounds both ways + favored/risky, colour-coded), from expected damage; pure helpers tested against the engine formula; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
The trading side is heavily decision-instrumented (margins, fair value, break-even, average-down); the adventure side showed raw danger stats (regionDanger + per-axis colour, 11n) but left "can I actually win here?" as mental math. A rounds-based forecast turns the stat comparison into a concrete read.

## The honest-estimate choice
The engine's combat is RNG: `damage = max(1, roll[ceil(atk/3)..atk] − floor(def/4))` (quest.ts:394). I mirror its MEAN in `expectedHit` and forecast from expected damage both ways. It's labelled an estimate (≈, "rounds roll with variance, not a promise") because it is one — but the mean is the right central read for a go/no-go decision. The player strikes first each round, so a tie (down it on the very round you'd fall) is a win → `favored = roundsToKill <= roundsToFall`.

## Drift risk (acknowledged)
`expectedHit` DUPLICATES the engine's damage formula in the UI (the engine's `damage()` is local, unexported, and rng-shaped — no mean to import). Documented with a "keep in sync with quest.ts:394" comment and pinned by tests against hand-computed means. If the engine formula moves, this forecast drifts silently — acceptable for an explicitly-approximate hint, flagged for future-self.

## Outcome
- `game.ts`: `expectedHit(atk, def)` (mirrors the engine mean) + `combatForecast(you, foe)` → `{roundsToKill, roundsToFall, favored}`, both pure.
- `ExpeditionPanel.tsx`: a forecast line under the danger readout in the embark screen — "forecast: ≈N rounds to down it · it downs you in ≈M · favored/risky" (green/red), using `regionDanger` (worst foe) + `deriveStats` (your stats) + `trainedMax` (full hp).
- Tests (+3): `expectedHit` against three hand-computed means (incl. the armour-floors-to-1 case) + `combatForecast` (favored tie / outmatched) + an embark-screen render (forecast + favored/risky surface). 321/321 unit, 9/9 e2e. FINDINGS #148.

## Gates
- [x] `expectedHit` matches the engine damage() mean (pinned values)
- [x] `combatForecast` favored/risky incl. the player-strikes-first tie
- [x] Embark screen renders the forecast (render test)
- [x] Typecheck + 321 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- If the combat formula ever changes, update `expectedHit` (quest.ts:394 is the source of truth).
- Factor in dragonfire (extra damage from dragons) for a sharper estimate vs draconic regions.
