# Phase: Exchange Wars — Phase 7f: Replay Verifier (Leaderboards Brick 1)

**Started:** 2026-06-11
**Hat:** Builder (leaderboards arc — unblocked by Jesse's Supabase schema)
**Goal:** The anti-cheat core: `replayRun(seed, startGp, log, finalTick)` deterministically reproduces a recorded run (same hash, same worth); the UI records every human command into the save (`Game.commandLog`). A claimed score becomes a *provable* score.
**Done condition:** record→replay roundtrip is hash-identical in tests (incl. upgrades + offline gaps); UI records/clears/normalizes the log; gates green; CI + live.

## Scope (in)
- packages/engine/src/replay.ts: RunLogEntry, replayRun (createWorld → interleave commands at recorded ticks → worth + hashState)
- Barrel export; engine test: scripted run record→replay hash equality
- UI: Game.commandLog (persisted), appended in App.command(); cleared on restart; normalized for old saves
- UI test: log records tick+cmd; restart clears

## Scope (out — later bricks)
- leaderboard table SQL + Edge Function (needs Jesse's access token to deploy)
- Submission/browse UI

## Subsystems touched
- packages/engine/src/{replay.ts, index.ts}, packages/engine/test/replay.test.ts
- packages/ui/src/{game.ts, App.tsx}, packages/ui/test/app.test.tsx

## Gates
- [x] Record→replay hash-identical; tampered log diverges
- [x] typecheck + 128 unit + 7 e2e green
- [ ] CI green + live bundle verified (checked post-push)
