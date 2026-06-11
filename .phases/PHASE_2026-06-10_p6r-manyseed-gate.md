# Phase: Exchange Wars — Phase 6r: Many-Seed Robustness Gate

**Started:** 2026-06-10
**Hat:** Builder (foundations hardening)
**Goal:** New engine gate: 64 deterministically-derived seeds × 1.5k ticks, each asserting conservation (checkInvariants) and mid-run snapshot-resume hash equality. Affordable only post-6p; closes the Phase-1 "property tests over many seeds" leftover (no new dependency — seeds derive from the project RNG).
**Done condition:** gate green locally within budget (~40s), all suites green, CI + live verified.

## Scope (in)
- packages/engine/test/manyseed.test.ts (new suite)
- NEXT_STEPS Phase-1 leftover strike

## Scope (out)
- fast-check dependency (derived-seed loop gives the same coverage class without it)
- Resting-order caps / ring buffer (still queued, still micro)

## Subsystems touched
- packages/engine/test/ only — zero engine changes

## Gates
- [x] typecheck + 112 unit + 6 e2e green; many-seed gate ~30s solo, suite 51s total (parallel workers absorb it)
- [ ] CI green + live bundle verified (checked post-push)
