# Next Steps

## Phase 1 leftovers (minor, non-blocking)
- [ ] Hard cap on resting orders per agent/book (spam-test finding: books are soft-bounded by agent cancel discipline only)
- [ ] Trades window: switch `shift()` to ring buffer if window grows beyond 512
- [ ] Consider `fast-check` property tests over many random seeds (architect's 1000-seed gate; currently 5 fixed seeds + 3 market seeds)
- [ ] Determinism gate at 100k ticks in a slow/CI-only suite (current: 1.5k–6k ticks in the fast suite)

## Phase 2 — DONE 2026-06-10 (command protocol, slots, offline accrual)

## Phase 2b — DONE 2026-06-10 (NPC bailouts, production burn, flipper v3)

## Phase 2c — DONE 2026-06-10 (buyUpgrade, idle policy, autoFlip tiers, runFlipper extraction)

## Next candidates
- **Balance pass on idle tiers** (FINDINGS #15): multi-seed measurement harness, isolated vs competitive scenarios, fix tier-3 non-monotonicity, decide payback-period targets
- Momentum traders still bleed slowly despite bailouts (FINDINGS #12) — only worth touching if dislocations dry up
- pnpm workspace split: packages/{engine,cli,botkit} per architect design
- CI (GitHub Actions): typecheck + test; needs a remote first (Jesse's call)

## Phase 3 — Workspace hardening
- Split into pnpm workspaces: packages/{engine,cli,botkit} per architect design (deliberately deferred from Phase 1)
- CI (GitHub Actions): typecheck + test + purity gate

## Phase 4 — React PWA UI (reuse Bank-Made shell patterns; Playwright E2E against seeded worlds)
## Phase 5 — Server + leaderboards (replay seed+command-log server-side to verify scores — determinism IS the anti-cheat)
