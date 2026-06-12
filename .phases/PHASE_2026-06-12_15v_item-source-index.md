# Phase: Exchange Wars — Phase 15v: Item→Source Index ("where does this drop?") (Brick 204)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trade↔farm cross-economy link)
**Goal:** On a tradeable item that is also a monster drop, show where it's farmable — "🗡 farm: {monster}
{chance}% · {region}" — so the player sees the trade-vs-hunt choice and how the two economies connect,
the inverse index to 15u's region→loot view.
**Done condition:** The trade ticket shows a compact "farm:" line for any selected item that appears in a
monster drop table (top source by chance, +N more), nothing for pure commodities; suite + e2e green.

## Why this brick
15u closed the region→items direction (the embark screen shows a region's drop table). The inverse —
item→sources — belongs on the TRADING side: when you're pricing an item that happens to be a monster
drop (runes, bones, dragon gear), "you could farm this instead" is real context the ticket never showed.
It links the game's two economies: the price you see and the dive that could supply it. Reference info,
read-only (`MONSTERS[].drops` reverse-indexed, monster→region via `REGIONS[].monsters/.elite`); a small
contextual line gated to drop-items only, so it never crowds a staple's ticket. Completes the trade↔farm
cross-reference in both directions.

## Design — a pure reverse-index + one ticket line
- `game.ts`: `itemSources(itemId, monsters, regions)` → `ItemSource[]` (`{monsterId, monsterName,
  regionId, regionName, chance}`), sorted by chance desc (id tie-break). For each monster whose drop
  table contains `itemId`, resolve the region whose roster (`monsters` + `elite`) holds that monster.
  Structural params (engine-import-free), pure.
- `TradeTicket.tsx`: `itemSources(selected, MONSTERS, REGIONS)`; when non-empty, a "🗡 farm: {top.monster}
  {chance}% · {top.region} (+N more)" line near the wiki-snapshot context (NOT among the trade math).

## Scope (in)
- `game.ts`: `itemSources` + `ItemSource` interface
- `TradeTicket.tsx`: the "farm:" line (drop-items only)
- `app.test.tsx`: `itemSources` unit (reverse-index, region resolve, chance sort) + a ticket render assert

## Scope (out)
- No farm-vs-buy EV math (drop variance — keep it the source + chance, like 15u); no change to the
  embark loot line; no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `itemSources` reverse-indexes drops, resolves the region per monster (roster + elite), sorts likeliest first
- [x] the ticket shows a "farm:" line for nature_rune (a real drop) and nothing for shark (a pure staple)
- [x] UI suite (353, +2: `itemSources` unit + ticket farm-line render) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reverse-indexes engine-internal tables; monster ids from `region.monsters` are always valid.
