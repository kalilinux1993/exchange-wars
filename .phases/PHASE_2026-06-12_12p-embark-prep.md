# Phase: Exchange Wars — Phase 12p: Pre-Embark Preparedness Check (Brick 120)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG — instrument PREPARATION, not just the outcome forecast)
**Goal:** On the embark screen, warn when the loadout you're packing is missing something the region demands — antifire for a fire region (the #1 un-enforced death), food when a hard fight is plausible. UI-only, live on main.
**Done condition:** preparedness warnings on the embark screen driven by the packed draft + region hazards; pure helper truth-table-tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
The adventure loop is well-instrumented for OUTCOMES (embark forecast 12j, live combat read 12o, danger readout) but not for PREPARATION. The biggest silent failure is embarking a fire region (dragons_maw: "bring antifire or bring regrets") with no antifire packed — un-enforced, and you just burn. A readiness check catches it before you commit.

## Outcome
- `game.ts`: `embarkPrep({fiery, hasAntifire, hasFood, riskyFight})` → string[] warnings. Pure (booleans in). The food warning is gated on `riskyFight` (a non-favored forecast) so it only nags when a hard fight is plausible — no false alarms on the easy starting region.
- `ExpeditionPanel.tsx`: the embark-forecast IIFE now also computes `fiery` (any region foe with `dragonfire`), `hasAntifire`/`hasFood` (from the PACKED draft vs CONSUMABLES flags), and `riskyFight = !forecast.favored`, rendering the warnings under the forecast. Checks what you've PACKED, not what you own, so it's a live "you forgot X" nudge that clears as you add it.
- Tests (+4): `embarkPrep` truth table (antifire only when fiery+unpacked; food only when risky+unpacked; stacks both) + an embark render assertion that a non-fiery region (lumbridge) never nags for antifire. 337/337 unit, 9/9 e2e. FINDINGS #154.

## Gates
- [x] `embarkPrep` pure (antifire/food gating + stacking)
- [x] No false antifire nag on a non-fiery region (render test)
- [x] Typecheck + 337 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A one-click "fix it" (auto-add antifire/food from inventory) beside the warning.
- Warn when packed gear is inert (above your level) for the region.
