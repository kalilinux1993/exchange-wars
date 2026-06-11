# Phase: Exchange Wars — Phase 6w: Race Readout & Guide Refresh

**Started:** 2026-06-10
**Hat:** Builder (polish on the racing loop)
**Goal:** The Fortune chart shows a live signed "vs ghost" delta (interpolated at the current tick); the first-run guide gains a bullet for seeds/ghosts/challenge links.
**Done condition:** delta correct ahead/behind/past-ghost-end (unit-tested), guide bullet present, gates green, CI + live.

## Scope (in)
- WorthChart: ghostWorthAt interpolation + colored delta in the legend
- HelpOverlay: racing bullet
- Unit tests for the delta math/render

## Scope (out)
- Anything new — this phase polishes 6u/6v only

## Subsystems touched
- packages/ui/src/components/{WorthChart,HelpOverlay}.tsx, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 121 unit + 7 e2e green
- [ ] CI green + live bundle verified (checked post-push)
