# Phase: Exchange Wars — Phase 6y: Hidden-Tab Parity

**Started:** 2026-06-10
**Hat:** Builder (correctness/UX)
**Goal:** A hidden tab currently ticks erratically (browser timer throttling) — slower than the 1 tps offline rate, with no accrual on return. Make hidden ≡ closed: stamp + pause on hide, offline-accrue (chunked path included) on return; brief tab switches resume seamlessly.
**Done condition:** visibilitychange handler pauses + stamps on hide; on show, accrues (banner/overlay) or silently resumes prior speed on sub-minute blips; unit-tested; gates green; CI + live.

## Scope (in)
- App.tsx: visibilitychange effect (resume-speed ref; beginOffline on return)
- Unit test: hide stamps+pauses, return accrues, banner shows

## Scope (out)
- Web Worker ticking (overkill); changing OFFLINE_TPS

## Subsystems touched
- packages/ui/src/App.tsx, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 122 unit + 7 e2e green
- [ ] CI green + live bundle verified (checked post-push)
