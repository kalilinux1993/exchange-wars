# Phase: Exchange Wars — Phase 17f: A "watched" market filter track (Brick 240)

**Started:** 2026-06-12
**Hat:** Builder (UX — focus the market on your starred items)
**Goal:** Add a "watched" track to the MarketTable filter row — one click to show only the items on your
watchlist, the focus-down complement to scanning all 128 rows. Completes the watchlist arc (w to add →
★ to see → watched track to focus).
**Done condition:** Clicking the "watched" track filters the market to only `watched` items; suite + e2e green.

## Why this brick
17c (`w`) and 17d (per-row ★) let you build + see the watchlist in the market, but to ACT on it you still
scan past everything else. A "watched" filter track (mirroring the existing cheap/flippable/gear tracks)
collapses the 128-row market to just your starred handful — the natural third piece. It reuses the `watched`
Set already threaded into the MarketTable in 17d, so it's a track predicate + a chip, nothing new wired.

## Design — one predicate + one chip
- `MarketTable.tsx`: add `'watched'` to the `track` union, the track-button array, and `inTrack`
  (`track === 'watched'` → `watched?.has(m.itemId) ?? false`).
- `WatchlistPanel.tsx` (bonus): refresh the empty-state hint to mention the new ways to add (`w` / the ★),
  not just "from the ticket".

## Scope (in)
- `MarketTable.tsx`: `'watched'` track (union + chip + predicate)
- `WatchlistPanel.tsx`: empty-hint copy refresh
- `app.test.tsx`: the "watched" track shows only watched items

## Scope (out)
- No engine change — no redeploy
- No auto-hide of the chip when the watchlist is empty (an empty filter result is self-explanatory, like the others)

## Subsystems touched
- packages/ui/src/components/MarketTable.tsx
- packages/ui/src/components/WatchlistPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] "watched" track shows only watched items; other tracks unaffected
- [x] UI suite (403, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — a direct mirror of the cheap/flippable track predicates added before.
