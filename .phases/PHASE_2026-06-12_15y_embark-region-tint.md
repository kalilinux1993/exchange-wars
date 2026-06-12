# Phase: Exchange Wars — Phase 15y: Region Tint on the Embark Readout (Brick 207)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — atmosphere / game-feel)
**Goal:** Tint the embark screen's "what you're getting into" block (flavor + danger + loot + forecast +
wounded) with a faint per-region gradient (14u's `arenaTheme`), so the plan FEELS like the region you're
about to enter — completing the per-region palette across all three adventure surfaces (combat → map → embark).
**Done condition:** The region-context block sits in a `.region-readout` div with a per-region gradient
backdrop that shifts as you change region; reads stay legible; suite + e2e green.

## Why this brick
14u tinted the COMBAT backdrop per region; 15t carried it to the RegionMap node halos. The embark screen
— where you choose WHICH region — was the one adventure surface still palette-neutral. A faint gradient
behind the danger/loot/forecast block ties the planning view to the same green-plains→ember-Maw→void-Abyss
palette the fight and map use, so flipping between regions shifts the mood of the whole readout. Pure
breadth pivot away from the long value-band/trading run; reuses an existing palette (no new colours).

## Design — wrap the readout in a tinted div
- `EmbarkPanel.tsx`: import `arenaTheme` from `./CombatScene`; wrap the flavor + danger + loot + forecast +
  wounded blocks (everything between the RegionMap and "Pack & Equip") in
  `<div className="region-readout" style={{ background: linear-gradient(155deg, {from}33, {to}11) }}>` —
  hex8 low-alpha so the dim/small text stays legible over the dark panel.
- `styles.css`: `.region-readout` padding/radius/margin + first/last-child margin collapse so the block reads
  as one contained, tinted card.

## Scope (in)
- `EmbarkPanel.tsx`: the tinted wrapper (arenaTheme import + div)
- `styles.css`: `.region-readout`
- `app.test.tsx`: the embark readout carries a per-region background (present + non-empty inline style)

## Scope (out)
- No change to the readout CONTENT (danger/loot/forecast/wounded unchanged — just wrapped); no tint on the
  Pack/loadout section (that's gear, not region mood); no engine change

## Subsystems touched
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] the embark readout sits in a `.region-readout` with a non-empty per-region gradient background
- [x] existing embark reads (flavor/danger/loot/forecast/wounded) still render inside the wrapper (transparent to text queries)
- [x] UI suite (356, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `arenaTheme`; wrapper is a transparent container around existing blocks.
