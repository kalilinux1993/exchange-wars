# Next Steps

## Phase 1 leftovers (minor, non-blocking)
- [ ] Hard cap on resting orders per agent/book (spam-test finding: books are soft-bounded by agent cancel discipline only)
- [ ] Trades window: switch `shift()` to ring buffer if window grows beyond 512
- [ ] Consider `fast-check` property tests over many random seeds (architect's 1000-seed gate; currently 5 fixed seeds + 3 market seeds)
- [ ] Determinism gate at 100k ticks in a slow/CI-only suite (current: 1.5k–6k ticks in the fast suite)

## Phase 2 — DONE 2026-06-10 (command protocol, slots, offline accrual)

## Phase 2 continuation — NPC ecology + bot quality (next)
- NPC bankroll top-up/respawn: noise traders extinct by 100k ticks, momentum −44% (FINDINGS #7) — model as explicit ledger mint
- Producer gp sink (producers hold 1B gp by 100k ticks; give gp somewhere to go — upkeep, expansion)
- Flipper cost-basis tracking: floor re-list price at break-even (reviewer note — self-undercut bounded but real)
- Flipper multi-slot buying (rests only 1 buy order today; paid slots underused)
- Automation unlock tiers beyond slots (auto-collect, auto-relist cadence upgrades)

## Phase 3 — Workspace hardening
- Split into pnpm workspaces: packages/{engine,cli,botkit} per architect design (deliberately deferred from Phase 1)
- CI (GitHub Actions): typecheck + test + purity gate

## Phase 4 — React PWA UI (reuse Bank-Made shell patterns; Playwright E2E against seeded worlds)
## Phase 5 — Server + leaderboards (replay seed+command-log server-side to verify scores — determinism IS the anti-cheat)
