# Phase: Exchange Wars — Phase 20e: aria-sort on the market's sortable headers (screen-reader column state) (Brick 317)

**Started:** 2026-06-13
**Hat:** Builder (a11y — WCAG 4.1.2 Name/Role/Value; the 5th dimension after motion/live-regions/modal-focus/toggle-state)
**Goal:** The MarketTable's 9 sortable column headers signalled the active sort + direction ONLY via the visual
`arrow` glyph (` ▲`/` ▼`). A screen reader had no way to know which column was sorted or in which direction.
Add `aria-sort` — the programmatic twin of the glyph — so the sorted column + direction is announced.
**Done condition met:** yes — an `ariaSort(key)` helper mirrors the `arrow` helper and feeds `aria-sort` on all
9 `<th>`s; a test pins margin's aria-sort flipping from 'none' to a direction on click while bid stays 'none';
suite + e2e green; typecheck clean.

## Design
- Add `ariaSort(key): 'ascending'|'descending'|'none'` next to `arrow` — `sort?.key===key ? (dir===1 ?
  'ascending' : 'descending') : 'none'`. Apply `aria-sort={ariaSort('…')}` to each sortable header.
  Mechanical and drift-proof: it reads the SAME `sort` state the visual arrow does.

## Scope (in)
- packages/ui/src/components/MarketTable.tsx (ariaSort helper + 9 aria-sort attributes)
- packages/ui/test/app.test.tsx (pin margin's aria-sort state on click)

## Scope (out — explicit non-goals)
- Keyboard OPERABILITY of the headers (WCAG 2.1.1 — `<th onClick>` isn't keyboard-activatable). Real defect,
  different criterion, bigger change → separate follow-up brick. No engine change → no redeploy.

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] all 9 sortable headers expose aria-sort matching the active sort; exactly one is non-'none' at a time
- [x] margin-header aria-sort test green (none → direction on click; bid stays none)
- [x] typecheck clean; UI suite (+1 = 484) green; e2e (14 + 1 on-demand skip) green
- [x] UI-only — no engine change, no redeploy

## Open questions
- Follow-up a11y dimensions: keyboard-operable sortable headers (WCAG 2.1.1); full Tab focus-trap in the
  help dialog; palette contrast audit.
