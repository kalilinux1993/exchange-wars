# Phase: Exchange Wars — Phase 17n: `/` focuses the market filter (Brick 248)

**Started:** 2026-06-12
**Hat:** Builder (UX — fast item search, the "/" convention)
**Goal:** Press `/` in the Exchange to focus the market filter input — the universal "search" shortcut, so
you can narrow 128 goods by name without reaching for the mouse. Extends the keyboard-driven trade flow.
**Done condition:** `/` over the market focuses the filter input (Exchange-active only, not while typing);
suite + e2e green.

## Why this brick
The MarketTable filter exists but you have to click it. `/` (the web-wide "focus search" key) makes finding
an item instant — the keyboard loop is j/k (nav) → b/s (side) → Enter (submit) → w (watch), and `/` adds the
"jump to search" verb. Lives in the MarketTable keydown beside j/k/w (already `active`-gated + typing-guarded,
navRef-fresh), focusing a ref to the filter input.

## Design — a filter ref + a `/` branch in the existing keydown
- `MarketTable.tsx`: a `filterRef` on the filter `<input>`. In the keydown handler, `e.key === '/'` →
  `e.preventDefault()` (don't type the slash) + `filterRef.current?.focus()`. Hint it in the placeholder
  ("filter items…  /").
- `HelpOverlay.tsx`: add `/` to the keyboard line.

## Scope (in)
- `MarketTable.tsx`: filterRef + `/` keydown branch + placeholder hint
- `HelpOverlay.tsx`: document `/`
- `app.test.tsx`: `/` focuses the filter (active); does nothing when inactive / while typing

## Scope (out)
- No engine change — no redeploy; no fuzzy-search/scoring (the existing substring filter is unchanged)

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `/` focuses the filter when the Exchange is active; ignored when inactive (and the typing-guard already exempts inputs)
- [x] UI suite (412, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the navRef-fresh + active-gated keydown pattern of j/k/w.
