# Phase: Exchange Wars — Phase 15k: Item Icons Across the Cockpit (Brick 193)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — iconography coverage)
**Goal:** Finish Jesse's "use the item icons where we can" — the trading-cockpit panels still showed
items as plain text; give each its real `ItemIcon`.
**Done condition:** TopFlips, PositionsPanel, TradeFeed (tape/mine/flips), ProfitPanel, MoversPanel
render the actual item icon beside each item name; suite + e2e green.

## Why this brick
15j put real icons on equipment/inventory/pack. But the cockpit's trading panels (top flips, your
positions, the trade tape, realized profit, movers) still listed item NAMES with no icon — so the
same item looked different (iconned in the market table, bare in the feeds). Reusing `ItemIcon`
makes items recognizable everywhere. All five panels already take `items` + build a `names` map, so
each gets a `wikiOf` map and an `ItemIcon` inline — uniform, no new plumbing.

## Design — ItemIcon inside each name span
- Each panel: `const wikiOf = new Map(items.map(i => [i.id, i.wikiId]))`; render
  `<span><ItemIcon id wikiId={wikiOf.get(id)} size={14} className="itemicon" /> {name}</span>`.
- `ItemIcon` renders the PNG in production (catalog has wikiId) → the span's text stays the name
  (an `<img>` has no text), so `getByText(name)` is unaffected; the glyph remains the fallback.

## Scope (in)
- `TopFlips.tsx`, `PositionsPanel.tsx`, `TradeFeed.tsx`, `ProfitPanel.tsx`, `MoversPanel.tsx`: ItemIcon per name
- `app.test.tsx`: a render assertion that one of these panels emits the item PNG

## Scope (out)
- No change to the SVG-glyph fallback or the equipment paperdoll figure; no engine change

## Subsystems touched
- packages/ui/src/components/{TopFlips,PositionsPanel,TradeFeed,ProfitPanel,MoversPanel}.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] TopFlips/Positions/TradeFeed(×3)/Profit/Movers render `ItemIcon` beside each item name
- [x] UI suite (336) + e2e (9) green — panel tests use DEFAULT_ITEMS → PNG → `getByText(name)` unaffected; a PositionsPanel test now asserts `img.itemimg`; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuse `ItemIcon` from 15j; all five panels already hold `items`.
