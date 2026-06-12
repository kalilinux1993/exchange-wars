# Phase: Exchange Wars — Phase 16o: Run Card (a shareable visual of your run) (Brick 223)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — visual identity / shareable artifact)
**Goal:** A styled SVG "Run Card" in the Hall — your run as a trophy (combat level, net worth, best haul,
survival streak, deeds) in the game's stone-and-gold livery — a screenshot-able visual artifact that
complements the text/native brag (16k/16l): the picture to its link.
**Done condition:** The Hall shows a `BragCard` SVG rendering the player's headline stats + the seed/site;
empty stats are omitted; pure display; suite + e2e green.

## Why this brick
The social arc has the LINK (challenge), the TEXT (16k brag), and the native SHARE (16l) — but no IMAGE,
and images carry far better in a feed than text. A run card is the visual half: a self-contained, themed
SVG of your achievements you can screenshot and post. It's also a Hall identity surface — the trophy
display a records-and-deeds game wants. Substantial visual/design work (the frontend-design discipline:
distinctive, themed, polished), fully testable as DOM/SVG, reusing the stat helpers already built. (Auto
PNG-export / share-as-file is a documented follow-up; the card itself is the deliverable.)

## Design — a themed SVG card component
- `components/BragCard.tsx`: `BragCard({ game, worth })` → an SVG (viewBox 0 0 480 270) — a dark stone
  gradient panel with a gold frame, the "⚔ EXCHANGE WARS" wordmark, two hero numbers (combat level · net
  worth), a secondary chip row (best haul / survival streak / deeds — omitting empty ones, mirroring
  `bragText`), and a footer (seed + site). Reuses `combatLevel`/`diveStreak`/`diveRecords`/`fmtCompact`.
- `styles.css`: `.bragcard` + the `bc-*` text classes (theme palette: gold/parchment/rise/dim).
- `App.tsx`: render `<BragCard game={game} worth={playerWorth(game)} />` at the top of the Hall section.

## Scope (in)
- `components/BragCard.tsx` (new) + `styles.css` (`.bragcard`/`bc-*`) + the Hall placement
- `app.test.tsx`: the card renders the wordmark/combat-level/worth/seed; a run with delves+deeds shows the chips

## Scope (out)
- No PNG/canvas export or share-as-file (a follow-up — the screenshot + the 16k/16l text-share cover sharing
  now); no overlay/modal (a Hall panel is simpler); no engine change

## Subsystems touched
- packages/ui/src/components/BragCard.tsx (new)
- packages/ui/src/App.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] `BragCard` renders the wordmark, combat level, net worth, and the seed/site footer
- [x] a run with a survived dive + a deed shows the best-haul/survival/deeds chips; a fresh run omits them
- [x] UI suite (372, +2) + e2e (9) green; typecheck clean. Fixed a locator collision the card introduced: the always-mounted Hall now carries "seed 42 …", so the challenge-link test was tightened to the toast's distinctive flavor (the recurring #147/#150 lesson)
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — pure display over existing stat helpers.
