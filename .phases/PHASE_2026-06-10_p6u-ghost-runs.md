# Phase: Exchange Wars — Phase 6u: Ghost Runs

**Started:** 2026-06-10
**Hat:** Builder (determinism-powered feature)
**Goal:** Restarting the same seed races your best previous run as a dim dashed line on the Fortune chart — the local, serverless half of the ghost-leaderboards idea. Determinism makes the ghost fair: same seed, same world.
**Done condition:** ghost stored on same-seed restart (best-by-final-worth, never displaced by a weaker run), rendered + labeled on the chart, unit + UI tested, gates green, CI + live.

## Scope (in)
- game.ts: `GhostRun`, `Game.ghost?`, `ghostForRestart(prev, seed)`
- App.tsx: restart() attaches ghost; WorthChart receives it (seed-matched only)
- WorthChart: shared scales for both lines, dashed dim ghost polyline, legend
- Tests: ghostForRestart best-of logic; full restart→ghost-on-chart flow

## Scope (out)
- Server ghost sharing (needs the leaderboards arc); ghost for export/import saves (they carry their own ghost field naturally)

## Subsystems touched
- packages/ui/src/{game.ts, App.tsx, components/WorthChart.tsx, styles.css}, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 116 unit + 6 e2e green
- [ ] CI green + live bundle verified (checked post-push)
