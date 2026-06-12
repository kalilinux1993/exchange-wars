# Phase: Exchange Wars — Phase 15t: Region-Identity Tint on the Map (Brick 202)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — atmosphere / game-feel)
**Goal:** Give each node on the RegionMap a soft per-region colour halo (reusing 14u's `arenaTheme`),
so the trail visibly shifts from green plains → ember Maw → void-purple Abyss — the descent is FELT on
the map, not just labelled, matching the combat backdrop's region palette.
**Done condition:** Each map node carries a colour halo from `arenaTheme(region.id)`; locked nodes
dimmer; the node's state colour (cleared/frontier/locked) stays intact on top; suite + e2e green.

## Why this brick
14u themed the COMBAT backdrop per region (verdant → ember → void), but the RegionMap — the surface that
shows the whole descent at once — is monochrome gold/stone. The queued follow-up ("the RegionMap trail/
nodes could carry the same per-region tint") closes that: a colour halo behind each node ties the map to
the same palette the fight uses, so the journey from plains to Abyss reads as a gradient before you ever
embark. Pure breadth pivot away from the trading surfaces (a long value-band run just closed). Atmosphere,
reusing an existing palette — no new colours invented.

## Design — an additive halo, not a fill override
- Node circles are state-coloured by CSS (`.mapnode.cleared/frontier/locked circle`). A direct fill would
  clobber that, so the tint is a SEPARATE element: a `<circle r=12 className="maphalo" fill={arenaTheme(r.id).from}>`
  rendered FIRST in each node `<g>` (behind the r=9 state circle), showing as a coloured rim.
- `RegionMap.tsx`: import `arenaTheme` from `./CombatScene`; add the halo per node.
- `styles.css`: `.maphalo { opacity: .6 }`; `.mapnode.locked .maphalo { opacity: .3 }` (locked stays muted).

## Scope (in)
- `RegionMap.tsx`: the halo element + `arenaTheme` import
- `styles.css`: `.maphalo` rules
- `app.test.tsx`: the map renders a per-region halo (abyss halo colour ≠ plains halo colour)

## Scope (out)
- No change to node state styling / marks / selection ring / flash; no per-segment trail recolour (node
  halo is enough); no engine change

## Subsystems touched
- packages/ui/src/components/RegionMap.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] each node has a `.maphalo` filled from `arenaTheme(region.id)` (plains green ≠ abyss purple)
- [x] the state circle (cleared/frontier/locked colour) is unchanged — halo sits behind it (separate element)
- [x] UI suite (349, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `arenaTheme`; halo is purely additive.

## Discovered (logged, not fixed this brick)
- `monsterById(id)` THROWS on an unknown id; persisted state (`exp.combat.monsterId`, a bounty's
  `monsterId`) could carry a stale id after engine content changes, and the engine TICK also calls
  `monsterById` during combat resolution — so a UI render-guard alone is insufficient. Proper fix =
  load-boundary quarantine of stale persisted combat/bounty (likely engine-touching → Jesse-gated).
  → NEXT_STEPS robustness.
