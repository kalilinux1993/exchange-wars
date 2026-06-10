# Phase: Exchange Wars — Phase 6l: Fill Flash & CI Action Bumps

**Started:** 2026-06-10
**Hat:** Builder (UI juice + maintenance)
**Goal:** Player fills visibly flash on the Tape/My Trades when they land; CI actions bumped off deprecated majors (Node 20 runner removal 2026-09).
**Done condition:** flash animation plays once per new fill row (no re-flash on rerender), CI workflow on current action majors and green, all gates green, live bundle flipped.

## Scope (in)
- TradeFeed: stable per-fill keys so new rows mount fresh; CSS mount animation (gold flash fade)
- Tape rows involving the player (mine-row) flash the same way
- .github/workflows/ci.yml: actions/checkout, actions/setup-node (+ pages actions if stale) major bumps
- Unit test: fill keys stable/unique

## Scope (out — explicit non-goals)
- Sound; purse/chart animations; catalog growth (next iterations)

## Subsystems touched
- packages/ui/src/components/TradeFeed.tsx, packages/ui/src/styles.css
- .github/workflows/ci.yml

## Gates
- [x] typecheck + 107 unit + 6 e2e green
- [ ] CI green on bumped actions + live bundle verified (checked post-push)
