# Phase: Exchange Wars — Phase 6z: Catalog 120

**Started:** 2026-06-10
**Hat:** Builder (content)
**Goal:** Catalog 100→120 items (80 staples + 40 exotics) — post-6p the suite cost is trivial; more markets to trade is the standing directive's most literal ask.
**Done condition:** 120-item catalog live; two-leg sweep for any tier the re-roll breaks; docs counts updated; gates green; CI + live.

## Scope (in)
- `npm run gen:catalog -- --staples 80 --exotics 40`
- Two-leg sweeps on red (FINDINGS #38 routine)
- README/SESSION_RESUME item-count updates

## Scope (out)
- UI changes; engine changes beyond TUNING re-locks

## Subsystems touched
- packages/engine/src/catalog.ts (GENERATED), packages/engine/src/agents.ts (TUNING if swept), README.md, SESSION_RESUME.md

## Gates
- [x] typecheck + 122 unit + 7 e2e green — re-roll broke t1/t2 with −10k holes (FINDINGS #40); three-tier sweep re-locked t1 cad6/v0.10, t2 cad7/v0.12; t3 verified
- [ ] CI green + live bundle verified (checked post-push)
