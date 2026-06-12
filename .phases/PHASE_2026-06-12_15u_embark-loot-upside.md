# Phase: Exchange Wars — Phase 15u: Loot Upside on the Embark Decision (Brick 203)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — embark risk/reward symmetry)
**Goal:** Show the REWARD side of a region on the embark screen — its gp-per-kill range and the notable
items its roster can drop — so the "is this region worth it?" call weighs loot against the danger/forecast
it already shows, instead of being risk-only.
**Done condition:** The EmbarkPanel renders a "loot: ≈lo–hi gp/kill · drops: …" line (with item icons)
for the selected region, derived from its roster's gp ranges + drop tables; suite + e2e green.

## Why this brick
The embark screen is densely instrumented on RISK: foe ⚔/🛡 danger (colour-coded vs your kit), leech,
elite warnings, a rounds-to-kill/rounds-to-fall forecast, prep warnings. But the REWARD half of the
decision — what you stand to GAIN — is invisible until you're already in the dive (the bestiary shows
per-monster drops, but only for monsters you've MET, and not aggregated for the region you're about to
enter). That's the same asymmetry 15n fixed for the dive recap (death toasted, success didn't): the
adventure surface narrates danger but not payoff. A "loot here" line — gp/kill range + the region's
notable drops — makes the embark a real risk⟷reward weigh, not just a "can I survive?" check. Data is
read-only (`region.monsters` → `monsterById` → `gp`/`drops`); pure breadth in the adventure system.

## Design — a pure aggregator + one embark line
- `game.ts`: `regionLoot(roster)` over a structural roster (`{gp:[number,number]; drops:{itemId;chance}[]}[]`)
  → `{ gpLo, gpHi, drops }`: gpLo/gpHi = min-floor/max-ceiling single-kill gp across the roster; `drops` =
  each distinct drop at its BEST chance across the roster, sorted by chance desc (id tie-break). Pure.
- `EmbarkPanel.tsx`: resolve the roster (it already builds `roster` ids for the dragonfire check), call
  `regionLoot`, render a "loot: ≈{gpLo}–{gpHi} gp/kill · drops: {top 4 as ItemIcon+name} (+N more)" line
  right after the danger line (risk → reward → forecast verdict).

## Scope (in)
- `game.ts`: `regionLoot` + `RegionLoot` interface
- `EmbarkPanel.tsx`: the loot line (icons via the existing `wikiOf`/`names` maps)
- `app.test.tsx`: `regionLoot` unit (gp range + best-chance dedup/sort) + an embark render assert

## Scope (out)
- No expected-value math (drop chance × wiki price) — keep it a clear range + a drop list, not a
  speculative gp/hr; no per-dive item-loot accounting (that's the engine-gated `ExpeditionState` gap);
  no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `regionLoot` returns the roster's gp floor→ceiling and distinct drops at best chance, sorted desc
- [x] the embark screen shows a loot line with the region's gp/kill range and notable drops (icons)
- [x] UI suite (351, +2: `regionLoot` unit + embark loot-line render) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — roster ids come from `region.monsters` (engine-internal, always valid), so `monsterById` is safe here.
