# Phase: Exchange Wars — Phase 12v: Scroll Selected Market Row Into View (Brick 126)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (input/UX — close the 12g keyboard-nav gap on long lists)
**Goal:** When the market selection moves (j/k or any select), scroll the selected row into view so it can't walk off-screen on a long/filtered list. UI-only, live on main.
**Done condition:** selected row scrolls into nearest view on selection change; jsdom-safe; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12g's j/k nav walks the selection through the market table, but on a long or filtered list the selected row could scroll off-screen — you'd lose track of what's selected. `scrollIntoView({block: 'nearest'})` keeps it visible (and is a no-op when it's already on screen, so clicks don't jump the view).

## Outcome
- `MarketTable.tsx`: a `bodyRef` on `<tbody>` + an effect keyed on `selected` that scrolls `tr.selected` into nearest view. A `typeof row.scrollIntoView === 'function'` guard sidesteps jsdom (no real layout) without a crash.
- Tests (+1): stub `Element.prototype.scrollIntoView`, rerender MarketTable with a moved selection, assert it's called (restored in `finally`). 347/347 unit, 9/9 e2e. FINDINGS #160.

## Gates
- [x] Selected row scrolls into view on selection change (render test, stubbed scrollIntoView)
- [x] Typecheck + 347 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Quick-select digits for the top market rows (queued; mind the 1/2/3 room-key collision).
