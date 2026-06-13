# Phase: Exchange Wars — Phase 17j: Make the market decision tools discoverable (Brick 244)

**Started:** 2026-06-12
**Hat:** Builder (onboarding/discoverability — teach the tools that exist)
**Goal:** The MarketTable's decision tools (sort by margin/band/swing/volume; filter tracks
flippable/cheap/steady/gear/watched) are powerful but under-surfaced — the help doesn't mention the
sort/filter tooling, and 4 of 8 track chips have no tooltip. Teach them: a concise help line + tooltips on
every track chip.
**Done condition:** The How-to-Play "decide with the numbers" item names the table's sort columns + filter
tracks; every track chip has an explanatory `title`; suite + e2e green.

## Why this brick
Across the session I added sortable columns (margin 14d / band 15q / swing 16y) and filter tracks (cheap 15q
/ watched 17f / steady 17h) — a deep "narrow 128 goods to your best candidates" toolkit. But a player learns
the game from the help overlay + hovering, and neither teaches these tools: the help's decision item stops at
value-bands/alerts, and the staples/exotics/gear/flippable chips are bare. Powerful-but-hidden tools might as
well not exist. This surfaces them (honest discoverability at feature saturation), no new mechanics.

## Design — one help sentence + the missing chip titles
- `HelpOverlay.tsx`: append one concise sentence to the existing "Decide with the numbers" item — the table
  sorts by margin / value-band / swing / volume and filters to flippable / cheap / steady / gear / your
  watchlist. (Amend the existing item; don't add a 14th.)
- `MarketTable.tsx`: give the remaining track chips (`staples`, `exotics`, `gear`, `flippable`) a `title`
  (cheap/watched/steady already have one), so each lens self-explains on hover.

## Scope (in)
- `HelpOverlay.tsx`: one sentence on the table's sort/filter tools
- `MarketTable.tsx`: titles for staples/exotics/gear/flippable chips
- `app.test.tsx`: help mentions the filter tracks; the flippable/gear chips carry a title

## Scope (out)
- No new tool, no engine change — no redeploy
- No restructuring of the help overlay (amend one item)

## Subsystems touched
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/src/components/MarketTable.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] help "decide" item names the sort columns + filter tracks; all 7 non-'all' track chips have a title
- [x] UI suite (406, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — copy + tooltip pass over existing surfaces.
