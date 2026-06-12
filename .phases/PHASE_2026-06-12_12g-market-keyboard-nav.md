# Phase: Exchange Wars — Phase 12g: Market Keyboard Navigation (Brick 111)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (input/UX — make the core trading loop keyboard-fast)
**Goal:** j/k (and ↑/↓) walk the market-table selection through the displayed order; the selected row loads into the offer ticket (as a click already does). UI-only, live on main.
**Done condition:** j/k/↑/↓ move selection within MarketTable, clamped, matching the on-screen sort/filter; gated to the Exchange tab; ignored while typing; pure cursor helper tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
The longest-deferred game-feel item (queued since 11a's keyboard shortcuts). Trading is click-only; a keyboard walk over the market makes the cockpit fast for power users and pairs with the existing 1/2/3/p/? hotkeys. A genuinely new *capability* axis after a run of analytics/progression bricks.

## Key design choice
No new "cursor" concept: the market already has a `selected` prop that both highlights the row AND loads the ticket via `onSelect`. So j/k simply move `selected` through the displayed `sorted` array — the highlight and ticket follow for free, zero new state or CSS. The nav reads the **displayed** order (post sort+filter), so it always matches what's on screen.

## Two traps caught
- **All rooms stay mounted** (`board tabhidden`, not conditional render) — so MarketTable's window keydown listener is live even on the Adventure/Hall tabs. Added an `active` prop (`room === 'exchange'`) gating the handler, so j/k never move the hidden market. (An `offsetParent`-visibility check was rejected: jsdom has no layout, so it would mis-fire in tests.)
- **Stale closures**: the listener binds once (empty deps) but must read current sorted/selected/onSelect/active — funnelled through a single `navRef` updated every render, so no rebind churn and no stale state.

## Outcome
- `game.ts`: `nextRowIndex(cur, delta, len)` — pure clamp (no wrap; -1 cursor → first row; -1 when empty).
- `MarketTable.tsx`: `active?` prop + a once-bound window keydown effect reading `navRef`; guards modifiers + INPUT/SELECT/TEXTAREA/BUTTON/contentEditable; `preventDefault` on the arrows; hint text updated to advertise j/k.
- `App.tsx`: passes `active={room === 'exchange'}`.
- Tests (+6): `nextRowIndex` truth table (clamp both ends, -1 cursor, empty) + MarketTable nav (j→next, ArrowDown clamps at bottom, k→prev), inactive-tab no-op, and typing-in-filter no-op. 310/310 unit, 9/9 e2e. FINDINGS #145.

## Gates
- [x] `nextRowIndex` pure (clamp/no-wrap/-1 cursor/empty)
- [x] j/k/↑/↓ move selection in displayed order; gated to active tab; ignored in inputs (render tests)
- [x] Typecheck + 310 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Scroll the keyboard-selected row into view when the list is long (skipped v1 — jsdom scrollIntoView flakiness; needs a typeof guard).
- Quick-select digits for the top market rows (queued).
