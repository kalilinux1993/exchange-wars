# Phase: Exchange Wars — Phase 6t: Chunked Offline Catch-up

**Started:** 2026-06-10
**Hat:** Builder (UX/responsiveness)
**Goal:** Reopening after a long absence must not freeze the tab — the 100k-tick cap was ~14s of synchronous runTicks at 100 items.
**Done condition:** big offline debts run in chunks behind a progress overlay; small ones stay sync; all three offline entry points share the path; tests cover the chunk driver; gates green; CI + live.

## Scope (in)
- game.ts: planOfflineProgress / finishOfflineProgress split (applyOfflineProgress = their sync composition)
- App.tsx: beginOffline router (≤5k ticks sync; else 1k-tick setTimeout slices), "The world turns…" scrim + progress bar, finalize latches news/fills/deeds + save + cloud push
- styles.css: .catchup overlay
- Unit test: 20k-tick debt on a tiny world (CI scaling rule)

## Scope (out)
- Web worker for the sim (overkill at current sizes); rAF pacing

## Subsystems touched
- packages/ui/src/{game.ts, App.tsx, styles.css}, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 114 unit + 6 e2e green (new chunked-catch-up test included)
- [ ] CI green + live bundle verified (checked post-push)

## Note
- Declared retroactively — the phase file was skipped at kickoff (caught at closeout; process slip, work itself followed the ritual).
