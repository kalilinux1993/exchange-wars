# Phase: Exchange Wars — Phase 17s: Clear the market filter (Esc + ✕) (Brick 253)

**Started:** 2026-06-12
**Hat:** Builder (UX — finish the filter interaction)
**Goal:** Make the market filter easy to clear: `Esc` (while focused) blanks it and blurs; a `✕` button
appears when there's text and clears it (refocusing). Completes the filter UX opened by 17n's `/`-to-focus.
**Done condition:** `Esc` in the filter clears it; the `✕` shows only when non-empty and clears on click;
suite + e2e green.

## Why this brick
17n made the filter keyboard-reachable (`/` focuses it), but there was no quick clear — you had to
select-all + delete. `Esc`-to-clear is the universal search-box convention (and pairs with `/`); a `✕` is the
mouse equivalent, shown only when the field has content so it adds nothing on an empty filter. Small, clean,
zero density on the common (empty) case.

## Design — an Esc keydown on the input + a conditional ✕
- `MarketTable.tsx`: the filter `<input>` gains `onKeyDown` → on `Escape`, `setFilter('')` + `blur()`. A
  `✕` `<button className="filterclear">` rendered only when `filter !== ''`, `onClick` → `setFilter('')` +
  refocus the input (via `filterRef`, which 17n already added).
- `styles.css`: a tiny `.filterclear` (inline, muted).

## Scope (in)
- `MarketTable.tsx`: Esc-clears + the ✕ clear button
- `styles.css`: `.filterclear`
- `app.test.tsx`: typing then Esc clears; the ✕ appears with text, clears on click, is absent when empty

## Scope (out)
- No change to the substring-filter logic; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] Esc in the filter clears + blurs; ✕ shows only when non-empty and clears on click
- [x] UI suite (417, +1) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — the window keydown listener ignores INPUT targets, so Esc is handled on the input itself (no conflict).
