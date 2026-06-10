# Phase: Exchange Wars — Phase 4f: CI, Auto-Deploy & Mobile

**Started:** 2026-06-10
**Hat:** Builder (standing directive + infra leverage)
**Goal:** GitHub Actions runs every gate on push and auto-deploys Pages from main (retiring manual gh-pages pushes); the board works on a phone; catalog to 22.
**Done condition:** CI workflow green on a real push (typecheck + unit + Playwright on ubuntu); Pages switched to workflow builds and serving the CI-built bundle; mobile e2e spec (390px viewport) green; 22-item catalog with all gates green; suite timeouts CI-proofed.

## Scope (in)
- Catalog +2: steel bar (550/1050), amethyst (3200/6000)
- vitest global testTimeout 30s (CI runners are slower; longrun/market specs were near the 5s default)
- Mobile CSS pass (market table horizontal scroll, ≤640px density) + phone-viewport e2e spec
- .github/workflows/ci.yml: test job (typecheck, vitest, playwright chromium) + deploy job (Pages artifact, main only); switch repo Pages build_type to workflow
- Verify the real CI run + live bundle

## Scope (out)
- More mechanics; art overhaul; offline-cap design pass (still queued)

## Subsystems touched
- packages/engine/src/catalog.ts (data), vitest.config.ts, packages/ui/src/styles.css, packages/ui/e2e, .github/workflows (new), repo Pages settings

## Gates
- [ ] All gates green locally at 22 items
- [ ] Mobile e2e green
- [ ] CI run green on GitHub; Pages deployed by the workflow; live bundle verified
- [ ] Manual deploy path documented as retired

## Open questions
- CI runner speed vs balance-gate timeout (30s local headroom; bump if the run says so)
