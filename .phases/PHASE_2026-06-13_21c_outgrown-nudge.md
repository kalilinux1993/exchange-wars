# Phase: Exchange Wars — Phase 21c: "you've outgrown your farm" progression nudge (Brick 321)

**Started:** 2026-06-13
**Hat:** Builder (adventure/progression — the flagged "Next" off the 16x/17g readiness arc)
**Goal:** A player whose combat has grown often keeps farming the shallow region they started in, not
realizing their SAFE DEPTH (diveReadiness) has advanced and deeper regions pay better loot. Nudge them:
"you keep farming {region} — you're ready for {deeper}".
**Done condition met:** yes — a pure `outgrownFarm(recentRegionIdxs, safeDepth)` returns the clustered
recent-farm region + the next step up ONLY when safe depth is genuinely past it and you've been diving
there; an embark line renders it from `game.delves` + the existing `readiness.ready`; off until there's
dive history (so it never fires fresh or in prop-less tests); unit + render tests; suite + e2e green.

## Design
- Pure `outgrownFarm(recentRegionIdxs: number[], safeDepth: number, minDives=3)` → `{farm, deeper}|null`:
  most-frequent recent region (ties → shallower), null unless that cluster has ≥minDives AND `safeDepth >
  farm`. `deeper = farm+1` (the immediate step you're ready for; ≤ safeDepth by construction).
- EmbarkPanel already has `game` and computes `readiness` (diveReadiness, 16x) — so feed
  `recentDelves(game.delves, 6).map(d => regionIndex(d.regionId))` + `readiness.ready`. New `.outgrown`
  line beside the readiness read; renders nothing when delves are empty → no collision with the 5 existing
  EmbarkPanel tests (none pass delves, none assert the readiness line).

## Scope (in)
- packages/ui/src/game.ts (pure `outgrownFarm`)
- packages/ui/src/components/EmbarkPanel.tsx (import + the nudge line)
- packages/ui/src/styles.css (`.outgrown` accent)
- packages/ui/test/app.test.tsx (outgrownFarm units + EmbarkPanel render: fires / silent-without-history)

## Scope (out — explicit non-goals)
- No new prop (EmbarkPanel already has `game`); no engine change → no redeploy
- Not keyed to the SELECTED region (it's a global progression read like diveReadiness)
- No auto-navigation; it's advice, not an action (the RegionMap "dive here" ring 17g already marks ready)

## Subsystems touched
- packages/ui/src/{game.ts, components/EmbarkPanel.tsx, styles.css}
- packages/ui/test/app.test.tsx

## Gates
- [x] outgrownFarm: fires when ready deeper than a real cluster; null on too-few dives / not-deeper / tie→shallower
- [x] EmbarkPanel renders the nudge with history + safe depth deeper; silent without dive history
- [x] typecheck clean; UI suite 500 (+6); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- Whether to count only SURVIVED dives as "farming" (currently all recent dives) — revisit if it misfires.
