# Phase: Exchange Wars — Phase 6q: Catalog 100

**Started:** 2026-06-10
**Hat:** Builder (content milestone)
**Goal:** Catalog 84→100 items (68 staples + 32 exotics) — affordable again after the 6p perf pass; README/docs item counts updated (README still claims 64).
**Done condition:** 100-item catalog live; sweep any tier the re-roll breaks (two legs); README count fixed; all gates green; CI + live.

## Scope (in)
- `npm run gen:catalog -- --staples 68 --exotics 32`
- Two-leg sweeps for any red tier (budgeted — FINDINGS #38)
- README "What's in the game" count + SESSION_RESUME state line

## Scope (out)
- UI changes beyond count text; engine changes

## Subsystems touched
- packages/engine/src/catalog.ts (GENERATED), packages/engine/src/agents.ts (TUNING only if sweep)
- README.md, SESSION_RESUME.md

## Gates
- [x] typecheck + 111 unit + 6 e2e green — re-roll broke tier 2, two-leg sweep relocked cad 8/v0.12; suite 48s at 100 items
- [ ] CI green + live bundle verified (checked post-push)
