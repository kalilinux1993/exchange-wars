# Phase: Exchange Wars — Phase 18t: Rebalance the Hall columns (kill the 6/1/1 void) (Brick 280)

**Started:** 2026-06-13
**Hat:** Builder (layout — fix a real visual-QA finding)
**Goal:** The Hall tab packs SIX panels into its first `.middle` column (BragCard, UpgradeShop, Records,
Conquest, Delve, Almanac) while columns 2 and 3 hold ONE each (WorthChart, Leaderboard) — a 6/1/1 split that
leaves a large dark void below the two short columns on a desktop width. Redistribute to ~3/3/2 so all three
columns fill, grouped thematically. Found by a visual QA pass (the Hall hadn't been visually assessed).
**Done condition:** the three Hall columns are balanced (3/3/2); all panels still render (class-based
locators unaffected); the rebalanced Hall verified by screenshot; suite + e2e green.

## Why this brick
A visual QA pass (capture each tab, read the image — what the green suite can't do) found the Exchange and
Adventure tabs healthy but the HALL carrying a real structural void: its first column is a tall stack of six
panels, the other two columns a single short panel each, so ~40% of the Hall's width sits empty below the
Fortune chart and Sprint Board. The panels have content on a fresh world (Almanac realm stats, the 8-region
Conquest roster), so it isn't a fresh-state artifact — it's an unbalanced layout. Redistributing the panels
across the three columns is a safe fix (the e2e/unit locators find panels by CLASS, not column position, and
every panel still renders), and it's a genuine UX improvement the test suite couldn't surface.

## Design — thematic 3/3/2 redistribution
- `App.tsx` Hall `<main>`: move `ConquestPanel` + `DelvePanel` from column 1 into column 2 (after WorthChart),
  and `AlmanacPanel` into column 3 (after LeaderboardPanel). Resulting columns:
  - **Col 1 (identity/economy):** BragCard · UpgradeShop · RecordsPanel
  - **Col 2 (progression/adventure):** WorthChart · ConquestPanel · DelvePanel
  - **Col 3 (competition/reference):** LeaderboardPanel · AlmanacPanel
  Balances 6/1/1 → 3/3/2, fills the void, groups logically.

## Scope (in)
- `packages/ui/src/App.tsx`: redistribute the 3 panels across the Hall's three `.middle` columns

## Scope (out)
- No CSS change (the columns already exist; this just assigns panels); no new panels; the milder, state-dependent
  Exchange/Adventure column-whitespace left as-is (fills with play). No engine change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx

## Gates
- [x] Hall columns balanced 3/3/2 — screenshot QA confirms all three columns now fill to ~the same depth, void gone (col1: Run Card·Clerk's Counter·Records; col2: Fortune·Conquest·Delve; col3: Sprint Board·Almanac)
- [x] every Hall panel still renders (the class-based e2e `.chart`/`.shop`/`.sprintboard` all pass; 11 e2e green)
- [x] UI suite (451) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — class-based locators make the reorder test-safe; screenshot confirms the visual balance.
