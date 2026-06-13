# Phase: Exchange Wars — Phase 20f: keyboard-operable sortable headers (WCAG 2.1.1) (Brick 318)

**Started:** 2026-06-13
**Hat:** Builder (a11y — WCAG 2.1.1 Keyboard, Level A; the operability follow-up split out of 20e)
**Goal:** The MarketTable's 9 sortable column headers were `<th onClick>` — mouse-only. A keyboard or
switch user could READ the sort state (aria-sort, 20e) but could not TRIGGER a sort at all. Make each
header focusable + activatable by keyboard (Enter/Space), with a visible focus ring.
**Done condition met:** yes — a `sortableProps(key)` helper adds `tabIndex={0}` + an Enter/Space
`onKeyDown` (preventDefault on Space) to all 9 headers while keeping the columnheader role + aria-sort;
a `:focus-visible` ring lands the gold outline inside the cell; a unit test pins Enter/Space sorting a
focused header + tabIndex presence, and an e2e focuses a header in a real browser and presses Enter to
sort; suite + e2e green; typecheck clean.

## Design
- Add `sortableProps(key): { tabIndex, 'aria-sort', onClick, onKeyDown }` next to `ariaSort`/`arrow` —
  it also DRYs the 9 repeated `aria-sort={ariaSort(k)} onClick={() => toggleSort(k)}` pairs. Enter or
  Space calls `toggleSort(key)`; Space `preventDefault()`s so the page doesn't scroll.
- Keep `<th>` (role=columnheader) — do NOT move onClick to a child `<button>`: that would break every
  existing `fireEvent.click(columnheader)` test (clicks on the th wouldn't reach the child handler) and
  force a CSS re-skin for no operability gain.
- CSS: `.market th.sortable:focus-visible { outline: 2px solid var(--gold); outline-offset: -2px }` so
  keyboard focus is visible and not clipped (also satisfies 2.4.7 for these new tab stops).

## Scope (in)
- packages/ui/src/components/MarketTable.tsx (sortableProps helper + apply to 9 headers)
- packages/ui/src/styles.css (focus-visible ring)
- packages/ui/test/app.test.tsx (Enter/Space sorts a focused header; tabIndex present)
- packages/ui/e2e/game.spec.ts (real-browser focus → Enter → sort)

## Scope (out — explicit non-goals)
- button-in-th APG variant (breaks click tests + needs a CSS re-skin; rejected above)
- Roving-tabindex (9 plain tab stops is fine for a header row); clickable data ROWS (still j/k nav)
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx + e2e/game.spec.ts

## Gates
- [x] all 9 headers focusable (tabIndex 0) + Enter/Space sorts; columnheader role + aria-sort intact
- [x] focus-visible ring renders for keyboard focus
- [x] unit test (Enter + Space + tabIndex) + e2e (real keyboard) green; existing header-click tests unbroken
- [x] typecheck clean; UI suite 485 (+1); e2e 15 (+1, 1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- Follow-up a11y dimensions: full Tab focus-trap in the help dialog; palette contrast audit; clickable
  data-row focusability (currently keyboard-served by j/k nav).
