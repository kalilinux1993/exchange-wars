# Phase: Exchange Wars — Phase 17c: `w` to watch the selected item (Brick 237)

**Started:** 2026-06-12
**Hat:** Builder (UX — finish the keyboard-driven trade loop)
**Goal:** Press `w` in the Exchange to toggle the watchlist on the loaded/selected market item — the missing
verb in the keyboard loop (j/k select → b/s side → Enter submit → **w watch**), with a toast confirming.
**Done condition:** `w` toggles `watch` on the selected item (Exchange-active only, not while typing); a toast
confirms add/remove; suite + e2e green.

## Why this brick
The trade loop is keyboard-driven end to end except WATCHING — you still have to mouse to the star. `w` (next
to the j/k market nav it belongs with) closes that gap. Lives in the MarketTable keydown alongside j/k (not
the App's global once-bound handler), because the MarketTable's `navRef` is refreshed every render — so `w`
reads the CURRENT selection + a fresh `onToggleWatch` with no stale-closure risk (the App handler would
capture a stale `selected`/`watch`).

## Design — MarketTable keydown handles `w`, App supplies a toasting toggle
- `MarketTable.tsx`: new optional `onToggleWatch?: (id) => void` prop, threaded into `navRef`; the keydown
  (already `active`-gated + typing-guarded) handles `w`/`W` → `navRef.current.onToggleWatch?.(selected)`.
- `App.tsx`: pass `onToggleWatch` that calls `toggleWatch(id)` AND fires a "★ watching {item}" / "☆ unwatched
  {item}" toast (direction read from `watch.includes(id)` before toggling). The fresh callback each render
  keeps `navRef` current.
- `HelpOverlay.tsx`: add `w` to the keyboard line.

## Scope (in)
- `MarketTable.tsx`: `onToggleWatch` prop + navRef + `w` branch
- `App.tsx`: pass the toasting `onToggleWatch`
- `HelpOverlay.tsx`: document `w`
- `app.test.tsx`: pressing `w` over the market toggles watch on the selected item; gated by `active`; ignored while typing

## Scope (out)
- No per-row watch star in the MarketTable (feedback is the toast + the ticket/WatchlistPanel star) — possible follow-up
- No engine change — no redeploy

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/App.tsx
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `w` toggles watch on the selected item; Exchange-active only; ignored in the filter input (2 tests)
- [x] UI suite (399, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the established navRef-freshness + active-gating pattern of the j/k nav.
