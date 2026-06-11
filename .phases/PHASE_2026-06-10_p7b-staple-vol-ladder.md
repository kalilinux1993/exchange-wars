# Phase: Exchange Wars — Phase 7b: Staple Volatility Ladder

**Started:** 2026-06-10
**Hat:** Builder (economy design, follows FINDINGS #40)
**Goal:** Pricey staples (≥5k gp) move to vol 0.12: tier 1 (ceiling 0.10) sheds exactly the items behind the −10k stale-dump holes; tiers 2/3 regain a real universe edge (their 0.12 ceiling stopped being decorative); exotics (0.13) stay human-only.
**Done condition:** generator ladder updated + regen; full three-tier two-leg sweep (vol-band change re-rolls everything); gates green; CI + live.

## Scope (in)
- genCatalog.ts tierVolatility ladder; regen 80/40
- Three-tier sweep (self-locking script pattern from 6z)
- FINDINGS entry; tier-comment updates

## Scope (out)
- Exotic track changes; TUNING structure changes

## Subsystems touched
- packages/cli/src/genCatalog.ts, packages/engine/src/catalog.ts (GENERATED), packages/engine/src/agents.ts (TUNING locks)

## Gates
- [x] Sweep both legs, all tiers (self-locking script) — only t3 moved (cad 4→5); curve t1 ~2k / t2 ~8-9.5k / t3 ~8.3-11k, all under 20× ceiling
- [x] typecheck + 123 unit + 7 e2e green
- [ ] CI green + live bundle verified (checked post-push)
