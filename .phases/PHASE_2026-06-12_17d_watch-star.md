# Phase: Exchange Wars — Phase 17d: Per-row watch ★ in the MarketTable (Brick 238)

**Started:** 2026-06-12
**Hat:** Builder (UX — make the watchlist visible where you scan)
**Goal:** A clickable watch star on every market row — gold ★ when watched (always visible), dim ☆ when not
(brighter on hover) — so you see your watchlist at a glance in the market and can toggle with the mouse
(parity with 17c's `w`).
**Done condition:** Watched rows show `.watchstar.on` (★); clicking a row's star toggles watch (without also
selecting the row); suite + e2e green.

## Why this brick
17c added `w` to watch the loaded item, but the MarketTable shows NO indication of which items are watched —
you scan 128 rows with zero watchlist context, and `w`'s only feedback was a transient toast. A per-row star
(the established conditional-marker pattern, like ⚡ event / ◆ your-best-offer) makes the watch state visible
where you actually shop, gives `w` a persistent per-row confirmation, and a clickable star is mouse parity
for the keyboard toggle. Reuses 17c's `onToggleWatch` — no new wiring.

## Design — a `.watchstar` button in the name cell, gated by a `watched` set
- `MarketTable.tsx`: new optional `watched?: ReadonlySet<ItemId>` prop. A `<button className="watchstar
  [on]">` at the start of the name cell: `★` when `watched.has(id)`, else `☆`; `onClick` stops propagation
  (so it doesn't also select/load the row) and calls `onToggleWatch?.(id)`.
- `App.tsx`: pass `watched={new Set(watch)}`.
- `styles.css`: `.watchstar` dim by default, brighter on `tr:hover`, gold + full-opacity when `.on`.

## Scope (in)
- `MarketTable.tsx`: `watched` prop + the per-row star button
- `App.tsx`: pass `watched`
- `styles.css`: `.watchstar` / `.watchstar.on`
- `app.test.tsx`: a watched row renders `.watchstar.on` (★); clicking an unwatched star calls `onToggleWatch` and NOT `onSelect`

## Scope (out)
- No new toggle handler (reuses 17c `onToggleWatch`); no engine change — no redeploy
- No watch FILTER track (could be a follow-up, like "cheap"/"flippable")

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/App.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] watched rows show ★ (`.watchstar.on`); clicking a star toggles watch without selecting the row (stopPropagation)
- [x] UI suite (400, +1 net) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)
- [x] Tightened the event-chip test (its loose button-name regex collided with the star's aria-label)

## Open questions
- None — the conditional row-marker + stopPropagation patterns are both established in this file.
