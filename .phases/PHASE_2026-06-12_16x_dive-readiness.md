# Phase: Exchange Wars — Phase 16x: Dive readiness advisor (Brick 232)

**Started:** 2026-06-12
**Hat:** Builder (player guidance — "how deep can I safely go?")
**Goal:** On the embark screen, a single readiness line that names the DEEPEST unlocked region you're favored
to farm (vs its TYPICAL foe, at full hp) — so unlocking a region (which only needs clearing the one before)
is distinguished from being STRONG ENOUGH to farm it.
**Done condition:** The embark panel shows "✓ ready / 📍 your safe depth is {region} / ⚠ outmatched" derived
from a pure `diveReadiness`; suite + e2e green.

## Why this brick
Unlock ≠ ready. You unlock a region by clearing the one before it (3 kills), but the foes jump in power
each tier — a freshly-unlocked deep region can flatten you. The per-region forecast already shows
favored/risky for the SELECTED region (vs its hardest foe), but the player has to click each region to scan.
A single global "you're favored to farm up to {region}; deeper still outmatches you — train up" removes the
scan and gives a clear progression signal: where to dive NOW, and that the new frontier needs more levels.
Complements (doesn't duplicate) the per-region read: readiness uses the TYPICAL foe (can I farm here?),
the per-region forecast uses the HARDEST foe (worst case).

## Design — pure `diveReadiness` + a readout line
- `ExpeditionPanel.tsx` (home of regionTypical/regionDanger): `diveReadiness(you, frontier)` — scan unlocked
  regions [0..min(frontier, last)], return `{ ready, frontier }` where `ready` is the DEEPEST index favored
  vs `regionTypical` (reuses `combatForecast`), -1 if even region 0 outmatches you. Pure.
- `EmbarkPanel.tsx`: compute `you = {atk,def: deriveStats, hp: trainedMax}` and render one line in the
  region-readout: `ready>=frontier` → "✓ ready — favored across every region you've unlocked"; `0<=ready<frontier`
  → "📍 your safe depth is {REGIONS[ready].name} — {REGIONS[ready+1].name}+ still outmatch you"; `ready<0` →
  "⚠ outmatched even in {REGIONS[0].name}".

## Scope (in)
- `ExpeditionPanel.tsx`: `DiveReadiness` interface + `diveReadiness` helper
- `EmbarkPanel.tsx`: the readiness readout line (reuses panel-scope lvls/trainedMax/eff)
- `app.test.tsx`: `diveReadiness` units (strong→frontier, weak→-1, frontier clamp) + a fresh-player render line

## Scope (out)
- No engine change (pure reads of MONSTERS via regionTypical) — no redeploy
- No change to the per-region forecast or the danger/loot lines
- Recommendation keys on the TYPICAL foe (farmability), not the rare elite — the per-region read covers worst-case

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `diveReadiness` pure; deepest-favored scan; clamps to REGIONS bounds; -1 when outmatched (4 units + a render line)
- [x] UI suite (392, +5) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)
- [x] Two pre-existing embark tests tightened for the new line (favored→forecast scope, region name→.maplabel)

## Open questions
- Assumes region difficulty is monotonic with depth (it is, by design) — "deepest favored" = a clean ready depth.
