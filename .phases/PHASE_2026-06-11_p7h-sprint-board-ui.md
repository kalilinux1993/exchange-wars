# Phase: Exchange Wars — Phase 7h: Sprint Board UI (Brick 3)

**Started:** 2026-06-11
**Hat:** Builder (leaderboards arc)
**Goal:** In-game Sprint Board: top-10 verified sprints for the current seed + submit-your-run flow. Self-gating: the panel probes the leaderboard table and renders NOTHING until the backend exists — safe to ship ahead of Jesse's deploy, lights up on its own afterward.
**Done condition:** panel hidden when backend absent; rows render when present; submit posts the truncated log with JWT and toasts the verified result; provability guard (`logSince`) blocks pre-recording saves; tests stub fetch (no real network in jsdom); gates green; CI + live.

## Scope (in)
- cloud.ts: fetchLeaderboard (null = backend absent), submitSprint (functions.invoke, JWT automatic)
- game.ts: `logSince` (0 = log complete from birth; pre-7f saves normalize to current tick → unsubmittable)
- components/LeaderboardPanel.tsx; App wiring (third column) + toast callback
- Tests: fetch stubbed globally (existing tests unaffected); panel hidden/rows/submit-toast; logSince normalize rules

## Scope (out)
- Deploy (Jesse's supabase login); cross-seed board browsing

## Subsystems touched
- packages/ui/src/{cloud.ts, game.ts, App.tsx, components/LeaderboardPanel.tsx, styles.css}, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 134 unit + 7 e2e green (module-scope fetch stub — jsdom fully offline)
- [ ] CI green + live bundle verified (checked post-push)
