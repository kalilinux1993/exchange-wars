# Phase: Exchange Wars — Phase 15j: Real Item Icons for Equipment/Inventory (Brick 192, Jesse-requested)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — art / iconography)
**Goal:** Show the ACTUAL item image (the wikiId PNG) wherever we render an item — equipped gear,
the satchel, the dive pack — instead of the generic category glyph (⚔/🛡/🍖). Jesse: "the items
equipped is a generic icon when it could be the actual item icon."
**Done condition:** Equipped + inventory + pack items render their wikiId PNG when the catalog has
one, falling back to the glyph otherwise; the MarketTable (already PNG) is the template; suite + e2e green.

## Why this brick
The catalog carries a `wikiId` per item and `public/icons/{wikiId}.png` exists (121 icons), but only
the MarketTable used them — every OTHER item surface (CharacterPanel paperdoll, GearManager,
PlayerPanel, EmbarkPanel pack) showed a generic category glyph via `itemIcon(id)`. So a player saw a
⚔ for their rune 2h sword instead of the sword. Jesse asked to use the real icons where we can.

## Design — one reusable ItemIcon, swap the call sites
- `ItemIcon({ id, wikiId, size, className })` (Icon.tsx): renders `<img src=icons/{wikiId}.png>` when
  `wikiId` is defined, else falls back to the existing `Icon`/`itemIcon` glyph. One component, the
  MarketTable's pattern made reusable.
- Swap `<Icon {...itemIcon(id)}>` → `<ItemIcon id wikiId={…}>` at the item sites: GearManager (worn +
  owned), PlayerPanel (inventory + worn), EmbarkPanel (pack), CharacterPanel (equipped paperdoll).
  Components with `items` build a `wikiOf` map (or use the def's `wikiId` directly); CharacterPanel
  gains an optional `wikiOf` prop, passed by ExpeditionPanel from `game.world.items`.

## Why it's test-safe
Tests render these panels with MINIMAL ItemDefs (no `wikiId`), so `ItemIcon` falls back to the glyph
exactly as before — existing glyph assertions stay green; only production (real catalog, with wikiId)
shows the PNG. The glyph fallback is preserved for any item the catalog hasn't mapped.

## Scope (in)
- `Icon.tsx`: `ItemIcon`
- `GearManager.tsx`, `PlayerPanel.tsx`, `EmbarkPanel.tsx`: swap to `ItemIcon` (build `wikiOf` / use `i.wikiId`)
- `CharacterPanel.tsx`: optional `wikiOf` prop + swap the equipped icon; `ExpeditionPanel.tsx`: pass it
- `app.test.tsx`: `ItemIcon` renders the PNG with a wikiId, the glyph without

## Scope (out)
- No change to the SVG-glyph art pipeline (it stays the fallback); no new icon assets; no engine change

## Subsystems touched
- packages/ui/src/components/{Icon,GearManager,PlayerPanel,EmbarkPanel,CharacterPanel,ExpeditionPanel}.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `ItemIcon` renders `<img src=icons/1319.png>` with a wikiId; falls back to the generic Icon without
- [x] equipped (CharacterPanel), satchel/worn (GearManager, PlayerPanel), pack (EmbarkPanel) all use `ItemIcon`; all 335 prior tests stayed green (minimal defs → glyph fallback)
- [x] UI suite (336, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Note
- The size prop sizes the glyph fallback; the PNG inherits `.icon` (16px, object-fit:contain, pixelated),
  matching the MarketTable icons. `exactOptionalPropertyTypes` made me widen `Icon`'s `className` to
  `string | undefined` so `ItemIcon` can forward an optional className.

## Open questions
- None — reuse the MarketTable pattern; wikiId + assets confirmed present.
