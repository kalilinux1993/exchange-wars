# Next Steps

## Phase 1 leftovers (minor, non-blocking)
- [ ] Hard cap on resting orders per agent/book (spam-test finding: books are soft-bounded by agent cancel discipline only)
- [ ] Trades window: switch `shift()` to ring buffer if window grows beyond 512
- [ ] Consider `fast-check` property tests over many random seeds (architect's 1000-seed gate; currently 5 fixed seeds + 3 market seeds)
- [ ] Determinism gate at 100k ticks in a slow/CI-only suite (current: 1.5k–6k ticks in the fast suite)

## Phase 2 — DONE 2026-06-10 (command protocol, slots, offline accrual)

## Phase 2b — DONE 2026-06-10 (NPC bailouts, production burn, flipper v3)

## Phase 2c — DONE 2026-06-10 (buyUpgrade, idle policy, autoFlip tiers, runFlipper extraction)

## Phase 2d — DONE 2026-06-10 (balance harness, tier-3 fix, balance gate)

## Phase 3 — DONE 2026-06-10 (npm workspace split: packages/{engine,cli})

## Phase 4a — DONE 2026-06-10 (UI shell: packages/ui, playable in browser)

## Phase 4b — DONE 2026-06-10 (Playwright E2E green; caught + fixed broken dev server)

## Next candidates
- **Publish to GitHub Pages** — IN PROGRESS, blocked on `gh auth login` (token in keyring is revoked; Jesse must re-auth). Then: repo create + push, `vite build --base=/exchange-wars/`, push dist to gh-pages, enable Pages → https://kalilinux1993.github.io/exchange-wars/
- **CI (GitHub Actions)**: typecheck + test + e2e once the remote exists
- **Phase 4c — PWA**: manifest, service worker, offline accrual on reopen (compute elapsed → fast-forward)
- Jesse steering pass on art direction / game-feel (current theme explicitly provisional)
- Payback-period design targets for upgrades; momentum bleed (FINDINGS #12) — both low priority

## Phase 3 — Workspace hardening
- Split into pnpm workspaces: packages/{engine,cli,botkit} per architect design (deliberately deferred from Phase 1)
- CI (GitHub Actions): typecheck + test + purity gate

## Phase 4 — React PWA UI (reuse Bank-Made shell patterns; Playwright E2E against seeded worlds)
## Phase 5 — Server + leaderboards (replay seed+command-log server-side to verify scores — determinism IS the anti-cheat)
