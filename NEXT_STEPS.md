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

## Published 2026-06-10 — LIVE at https://kalilinux1993.github.io/exchange-wars/
Repo: https://github.com/kalilinux1993/exchange-wars (public). Redeploy = `npm run build -w @exchange-wars/ui -- --base=/exchange-wars/`, then push dist to gh-pages.

## NEXT PHASE (designed, per Jesse): OSRS Wiki-powered catalog
Build-time snapshot generator — keeps the engine deterministic:
- `npm run gen:catalog` (packages/cli): fetch prices.runescape.wiki/api/v1/osrs `/mapping` + `/latest` + `/volumes` (descriptive User-Agent; few calls, build-time only — rate-limit gotchas in master memory)
- Select ~40–50 items: top daily volume, price ≥ ~30gp; derive anchors baseCost ≈ 0.75×price, consumeValue ≈ 1.5×price, volatility by tier/timeseries; keep REAL item ids + names; optionally wire GE buy limits to qty caps later
- Download icons once to packages/ui/public/icons/{id}.png (`oldschool.runescape.wiki/images/<icon>`; credit line in README); MarketTable/ladder show icons
- Known recurring cost: catalog regen re-rolls all seeds → routine tier-1 sweep + gate re-verify; ~50 items ≈ 350 agents → suite slows (CI budget already 120s; trim balance seeds if needed)
- Explicitly NOT live price sync (breaks determinism/saves/gates); a real-price display overlay could come later as decoration

## Next candidates
- Quests/contracts: NPC buy-contracts at premium ("deliver 50 lobsters") — goal-directed trading (FINDINGS #28)
- Tier-3 clerk perk: "trades events too" (currently all tiers stand aside from event markets)
- News history panel + event outcomes on the Tape; prestige/rebirth loop; ghost leaderboards (needs P5 server)
- ~~Offline-cap/payback design pass~~ CLOSED: cap 100k vs paybacks 43k–90k — tier 1 pays back in ~half a cap, by design
- Offline-cap/payback design pass (cap 50k ticks vs tier paybacks 40k–97k — tier 1 pays back in ~one full offline cap; intentional?)
- CI actions deprecation: bump actions/checkout + setup-node majors before 2026-09 (Node 20 runner removal)
- Achievements / milestones panel (first 100k, first whip, etc.) — cheap dopamine
- Sound-free juice: fill flash animations on the Tape/orders when player trades land
- **CI (GitHub Actions)**: typecheck + test + e2e on push; auto-deploy Pages on main (replaces the manual gh-pages push)
- **Phase 4c — PWA**: manifest, service worker, offline accrual on reopen (compute elapsed → fast-forward)
- Jesse steering pass on art direction / game-feel (current theme explicitly provisional)
- Payback-period design targets for upgrades; momentum bleed (FINDINGS #12) — both low priority

## Phase 3 — Workspace hardening
- Split into pnpm workspaces: packages/{engine,cli,botkit} per architect design (deliberately deferred from Phase 1)
- CI (GitHub Actions): typecheck + test + purity gate

## Phase 4 — React PWA UI (reuse Bank-Made shell patterns; Playwright E2E against seeded worlds)
## Phase 5 — Server + leaderboards (replay seed+command-log server-side to verify scores — determinism IS the anti-cheat)
