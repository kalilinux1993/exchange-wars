# Phase: Exchange Wars — Phase 4b: Browser E2E (Playwright)

**Started:** 2026-06-10
**Hat:** Builder (test infrastructure)
**Goal:** Close the verification loop at the browser level: Playwright drives the served game in real Chromium against the deterministic default seed — boot, trade round-trip with instant fills, fast-forward, upgrade purchase, and save/reload persistence.
**Done condition:** `npm run e2e` green: fresh-context boot (empty localStorage → seed-42 world, paused, 30k gp), full buy→fill→sell round-trip via the ticket, +1k fast-forward shows tick 1,000, slot purchase debits gp and raises the cap, page reload restores the saved world. All unit/jsdom gates stay green and e2e specs stay OUT of the vitest run.

## Scope (in)
- @playwright/test in packages/ui + chromium binary; playwright.config.ts with vite dev webServer
- packages/ui/e2e/game.spec.ts: 5 specs (boot, trade round-trip, fast-forward, upgrade affordability+purchase, save/reload)
- Root `npm run e2e` proxy script
- Determinism note: fresh browser context ⇒ empty localStorage ⇒ newGame(42), world starts paused ⇒ fully deterministic assertions

## Scope (out)
- CI wiring (no remote yet), cross-browser matrix (chromium only), visual snapshots, PWA (4c)

## Subsystems touched
- packages/ui/e2e/* (new), packages/ui/playwright.config.ts (new), package.json scripts; zero engine/UI logic changes expected

## Gates
- [x] e2e suite green in real Chromium — 5/5 in 12s. BONUS: first run caught a launch-blocking bug (dev server 500'd since 4a — vite 7/8 plugin skew; fixed by unifying on vite 8, FINDINGS #20)
- [x] vitest suite unaffected — 72 green, e2e dir outside its glob
- [x] All prior gates green — typecheck, build (vite 8, 116ms)

**Closed:** 2026-06-10 — done condition met.

## Open questions
- Google Fonts offline fallback (non-gating — system fallbacks render)
