# Phase: Exchange Wars — Phase 4d: Catalog II & Game Feel

**Started:** 2026-06-10
**Hat:** Builder (standing directive: more items, better UI; machine currently OFFLINE — push queued)
**Goal:** Grow the catalog to 18 items and give the UI its idle-game feel: a persistent net-worth chart and a live trade feed.
**Done condition:** 18-item catalog with all gates green (speculator scaling should absorb it — verify, tune only on red); net-worth history sampled into the save and charted; trade feed showing recent market activity with the player's fills highlighted; 72+ unit & 5+ e2e green; build clean; push + live redeploy attempted (queued if still offline).

## Scope (in)
- catalog.ts: +4 items (feather, clay, dragon bones, runite ore) spanning new low tier and upper-mid
- Game.worthHistory: throttled net-worth samples (every ≥50 ticks, capped 240), persisted in the save, defaulted for old saves
- WorthChart panel (SVG line, start-gp baseline), TradeFeed panel (last trades, player fills highlighted)
- Test updates; gh-pages redeploy + main push when network returns

## Scope (out)
- PWA/manifest, engine mechanics changes, art-direction overhaul

## Subsystems touched
- packages/engine/src/catalog.ts (data), packages/ui/* (game.ts, App, 2 new components, styles), tests

## Gates
- [x] All engine gates green at 18 items — one marginal cell (tier-1 competitive seed 1337, −2,121) fixed by cadence 8→7 (coprime with scripted 5); matrix now: tier 1 +7.6k/+10k avg, tier 3 ≈ +50k, all seeds positive, monotonic
- [x] UI jsdom + e2e green (72 + 5); build clean (68kB gzip)
- [x] Push + live deploy — QUEUED: machine fully offline (google.com unreachable); gh-pages dist built and ready; next online moment flushes both

**Closed:** 2026-06-10 — done condition met (network-dependent steps queued as declared).

## Open questions
- None — pattern-following phase.
