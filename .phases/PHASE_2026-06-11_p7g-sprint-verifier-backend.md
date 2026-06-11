# Phase: Exchange Wars — Phase 7g: Sprint Verifier & Leaderboard Backend (Brick 2)

**Started:** 2026-06-11
**Hat:** Builder (leaderboards arc)
**Goal:** The sprint format: best worth at EXACTLY tick 10,000 on a seed — bounded replay (~1.4s) fits Edge Function CPU budgets and makes scores comparable. Engine gains `verifySprint` (validation + replay, fully unit-tested); the Edge Function is a thin Deno wrapper over an esbuild bundle of the engine; leaderboard table SQL written (service-role-only writes).
**Done condition:** verifySprint tested (happy path + each rejection); engine bundles cleanly for Deno; function + SQL committed (deploy deferred — needs Jesse's access token); gates green; CI + live.

## Scope (in)
- engine replay.ts: SPRINT_TICKS / SPRINT_MAX_COMMANDS / verifySprint (+ tests)
- supabase/leaderboard.sql (public read; NO client write policies — function-only)
- supabase/functions/verify-score/index.ts (Deno) + generated engine.js via `npm run build:fn` (esbuild)
- DEV_GUIDE notes incl. deploy steps for Jesse

## Scope (out — brick 3)
- Client submit/browse UI (lands once the function is deployable)

## Subsystems touched
- packages/engine/src/replay.ts + test, supabase/, package.json (build:fn)

## Gates
- [x] verifySprint unit tests green (happy path, every rejection reason, verdict determinism, garbage tolerance)
- [x] build:fn bundles (53.3kb ESM); typecheck + 130 unit + 7 e2e green
- [ ] CI green + live verified (checked post-push)
