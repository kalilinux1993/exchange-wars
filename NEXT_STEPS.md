# Next Steps

## Phase 1 leftovers (minor, non-blocking)
- [ ] Hard cap on resting orders per agent/book (spam-test finding: books are soft-bounded by agent cancel discipline only)
- [ ] Trades window: switch `shift()` to ring buffer if window grows beyond 512
- [ ] Consider `fast-check` property tests over many random seeds (architect's 1000-seed gate; currently 5 fixed seeds + 3 market seeds)
- [ ] Determinism gate at 100k ticks in a slow/CI-only suite (current: 1.5k–6k ticks in the fast suite)

## Phase 2 — Player progression / idle layer (next)
- Player actions as a serializable command protocol (intents in, state-delta out) — bots and future UI share it
- Automation unlocks (auto-flipper tiers, more concurrent orders — GE-slot-style limits)
- Offline accrual = fast-forward N ticks (engine already does 10k ticks/100ms)
- Producer gp sink (producers currently accumulate wealth endlessly; harmless now, but give gp somewhere to go — upkeep, expansion)
- Smarter flipper baselines to balance against (current bot: bid+1/ask−1 with 3% margin filter)

## Phase 3 — Workspace hardening
- Split into pnpm workspaces: packages/{engine,cli,botkit} per architect design (deliberately deferred from Phase 1)
- CI (GitHub Actions): typecheck + test + purity gate

## Phase 4 — React PWA UI (reuse Bank-Made shell patterns; Playwright E2E against seeded worlds)
## Phase 5 — Server + leaderboards (replay seed+command-log server-side to verify scores — determinism IS the anti-cheat)
