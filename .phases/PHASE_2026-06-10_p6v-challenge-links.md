# Phase: Exchange Wars — Phase 6v: Challenge Links

**Started:** 2026-06-10
**Hat:** Builder (shareability)
**Goal:** `#seed=N` URLs start a game on that exact seed — fresh visitors jump straight in; players with a save get a challenge bar (their run is never clobbered silently). A "challenge link" chip copies the URL for the current seed.
**Done condition:** hash parsed+cleared on boot; no-save → direct start; with-save → challenge bar with start/dismiss; copy chip with toast; unit + e2e tested; gates green; CI + live.

## Scope (in)
- game.ts: parseChallengeSeed (pure)
- App.tsx: boot hash handling, challenge bar, copy-link chip (clipboard-guarded)
- Tests: parse, direct-start, challenge-bar flow; e2e: /#seed=777 boots seed 777

## Scope (out)
- Embedding ghosts in links (would need a share server); seed validation beyond integer

## Subsystems touched
- packages/ui/src/{game.ts, App.tsx, styles.css}, packages/ui/test/app.test.tsx, packages/ui/e2e/game.spec.ts

## Gates
- [x] typecheck + 120 unit + 7 e2e green (4 new unit tests + the #seed boot spec)
- [ ] CI green + live bundle verified (checked post-push)
