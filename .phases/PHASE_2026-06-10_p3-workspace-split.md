# Phase: Exchange Wars — Phase 3: Workspace Split

**Started:** 2026-06-10
**Hat:** Builder (structural refactor, zero logic change)
**Goal:** Split the flat package into npm workspaces — `packages/engine` (pure sim + tests) and `packages/cli` (runners) — so the Phase 4 UI lands as a sibling package importing `@exchange-wars/engine`.
**Done condition:** all 65 tests green from the new layout; `npm run sim` and `npm run balance` work; typecheck green; git history preserved through the moves (`git log --follow`); doc path references updated (citation drift checked).

## Scope (in)
- npm workspaces (DIVERGENCE from architect's pnpm pick: npm 11 has native workspaces, zero new tooling; structural benefit identical — recorded here)
- packages/engine: src (engine modules + new index.ts barrel) + test; packages/cli: run.ts, balance.ts importing `@exchange-wars/engine`
- Root: workspaces config, tsconfig.base.json + root tsconfig, vitest include update, script proxies
- Doc path updates (README/CLAUDE.md/DEV_GUIDE reference src/engine/*) — citation-auditor pass

## Scope (out)
- Build/bundle step (tsx runs TS directly; engine exports its src — bundling is a UI-phase concern)
- packages/botkit (bots are engine-internal by design — idle automation runs in the tick; revisit only if external bots appear)
- CI, remote, UI

## Subsystems touched
- File moves only: src/engine/* → packages/engine/src/, test/* → packages/engine/test/, src/cli/* → packages/cli/src/; configs; test import paths; CLI imports

## Gates
- [x] Full suite green from new layout — 66 tests (purity gate now also scans index.ts)
- [x] CLI smoke — sim runs via @exchange-wars/engine import; balance harness shares engine measureIdleTier
- [x] History preserved — all moves staged as git renames (R); --follow verified post-commit
- [x] Citation drift — citation-auditor: 70 citations checked, 0 broken, 1 cosmetic README tree comment fixed
- [x] Adversarial review: skipped — mechanical refactor fully verified by the existing gate suite (rationale recorded)

**Closed:** 2026-06-10 — done condition met.

## Open questions
- None — mechanical phase.
