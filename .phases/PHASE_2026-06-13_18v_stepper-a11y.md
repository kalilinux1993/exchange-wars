# Phase: Exchange Wars — Phase 18v: Accessible names on the pack steppers (a11y audit) (Brick 282)

**Started:** 2026-06-13
**Hat:** Reviewer → Builder (a11y audit — the one unmined quality dimension)
**Goal:** Audit the UI for icon/symbol-only buttons lacking an accessible name (a screen-reader bug) and fix
the real gap: the EmbarkPanel loadout pack steppers (`−`/`+`) had neither aria-label nor title, so a screen
reader announces "minus button" with no item context. Add aria-labels naming the item.
**Done condition met:** yes — the steppers carry `aria-label="pack one more/fewer {item}"`; verified via
`getByLabelText`; the rest of the symbol buttons confirmed already-named (title/aria-label); suite + e2e green.

## Why this brick
Accessibility was the one quality dimension untouched this session (after the reference-verify predictor
audit and the visual-QA layout pass). A sweep for symbol-only buttons found that the established pattern is
sound — every `×` remove, `🟢`/`🟡` band-alert, watchstar, and filter `✕` carries a `title` or `aria-label`
that serves as its accessible name — EXCEPT the EmbarkPanel pack steppers (`−`/`+`), which had neither, so
they read as bare "minus/plus button" with no item. The clickable market/positions/watchlist rows are
keyboard-reachable via the custom j/k nav (not a total block), so the steppers were the one clear gap.

## Design — name the steppers
- `EmbarkPanel.tsx`: `aria-label={`pack one fewer ${name}`}` / `pack one more ${name}` on the `−`/`+` buttons
  (the visible "−"/"+" text is unchanged, so the existing loadout test's `getByText('+')` still works).

## Scope (in)
- `packages/ui/src/components/EmbarkPanel.tsx`: aria-labels on the two pack steppers
- `packages/ui/test/app.test.tsx`: a `getByLabelText` assertion for the named steppers

## Scope (out)
- No row-focusability change (the j/k nav keyboard-reaches the rows; adding role/tabindex to `<tr>`/`<li>` across 3 panels is a larger, riskier change — deferred). No engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] pack steppers carry "pack one more/fewer {item}" accessible names (getByLabelText); other symbol buttons confirmed already-named
- [x] existing loadout test still passes (visible "+"/"−" text unchanged); UI suite (452, +1) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Deferred (noted): make clickable market/positions/watchlist ROWS Tab-focusable (role=button+tabindex+onKeyDown) — a broader a11y pass; the j/k custom nav covers the keyboard path today.
