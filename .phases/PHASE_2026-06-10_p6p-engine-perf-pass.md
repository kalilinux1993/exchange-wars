# Phase: Exchange Wars — Phase 6p: Engine Performance Pass

**Started:** 2026-06-10
**Hat:** Builder (performance, determinism-preserving)
**Goal:** Profile tickWorld at 84 items, optimize top hotspots WITHOUT changing behavior — proven by hashState equality on fixed seeds before/after. Payoff: faster gates → more catalog headroom (CI crept 4m35s→6m48s with catalog growth).
**Done condition:** baseline hashes captured pre-change; optimizations land with identical hashes (seeds 7/42/1337 × 8k ticks); measurable suite-time win; all gates green unchanged (no sweep needed by construction); CI + live.

## Scope (in)
- CPU profile of an 8k-tick 84-item run; identify top self-time functions
- 1-3 order-preserving optimizations (no RNG draws added/removed, no iteration reorder)
- Hash-equality proof script (before/after); suite timing comparison

## Scope (out — explicit non-goals)
- Any behavior change (those re-roll the universe and demand sweeps)
- Architecture rewrites (ring buffers etc. unless hash-provably safe and simple)

## Subsystems touched
- packages/engine/src/ (exchange.ts / agents.ts / sim.ts as profile dictates)

## Gates
- [x] Hash equality: seeds 7/42/1337 × 8k ticks — de79e783/328faa9b/9604942f identical before and after
- [x] typecheck + 111 unit + 6 e2e green; suite 219s → 41s, sim 5.1s → 1.13s (4.5×)
- [ ] CI green + live bundle verified (checked post-push)
