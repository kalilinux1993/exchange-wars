# Phase: Exchange Wars — Phase 13p: Mid-Dive Push Read (Brick 146)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG/dive; the risk half of the push-your-luck decision)
**Goal:** Between fights, show an hp-aware forecast vs the region's hardest foe so "push or bank?" is informed.
**Done condition:** the non-combat dive view shows a "push read" (combatForecast at CURRENT hp vs region danger, favored/risky, nudging extract when wounded with loot at stake); UI suite + e2e green. **MET.**

## Why this brick
13o framed the LOOT at stake on the extract button; the other half of push-your-luck is the RISK. The embark forecast runs once at full hp, but wounds carry between fights — and the mid-dive "venture deeper" button gave no read on whether your current hp makes the next push a gamble. So the player advanced blind into the exact decision the game is built around.

## Design — reuse the forecast, at CURRENT hp, vs the region's hardest
- In the non-combat branch, a "push read" line: `combatForecast({atk, def, hp: exp.hp}, regionDanger(region), dragonBonus)` — your derived stats at your live (possibly wounded) hp vs the hardest foe the region can send, counting dragonfire when no antifire holds (same bonus the live combat forecast uses).
- favored/risky coloured (up/down). When risky AND loot is at stake, it appends "— bank your haul?", pairing with 13o's extract payoff: together they say "you'd fall in ≈2 and 5,000 gp rides on it → leave."
- Honest, matching the existing forecast copy: the next encounter is random and rolls vary — an estimate, not a promise.

## Outcome
- `ExpeditionPanel.tsx`: a push-read `<p className="forecast">` above the venture/extract controls (wrapped the branch in a fragment).
- Tests (+1): a wounded (hp 8) non-combat dive in dragons_maw shows "push read: … risky — bank your haul?" (asserted on the `.forecast` textContent, robust to the inline `<b>` nodes).

## Gates
- [x] push read renders at current hp, turns risky when wounded + nudges extract (render test)
- [x] UI suite (262, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- The read uses the region's HARDEST foe (conservative); could also show the typical foe for a fuller picture.
- A heal-aware variant (counting packed food into rounds-to-fall).
