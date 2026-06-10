# Phase: Exchange Wars — Phase 5: OSRS Wiki Catalog

**Started:** 2026-06-10
**Hat:** Builder (executing the design from NEXT_STEPS, per Jesse's ask)
**Goal:** Catalog generated from real OSRS GE data (snapshot, build-time — determinism preserved): ~48 top-volume items with real names/ids/price scales and wiki icons in the UI.
**Done condition:** `npm run gen:catalog` fetches mapping/latest/volumes (descriptive UA), derives anchors (cost ≈ 0.75×price, value ≈ 1.5×price, tiered volatility), writes catalog.ts + downloads icons; UI shows icons; test suites refactored catalog-agnostic (no hardcoded item names); all gates green at the new catalog (tier-1 sweep expected); global test timeout raised for the bigger world; CI green; live verified; wiki/Jagex credit in README.

## Scope (in)
- packages/cli/src/genCatalog.ts + `npm run gen:catalog`; ItemDef gains optional `wikiId`
- Icons → packages/ui/public/icons/{wikiId}.png; MarketTable renders them
- Test refactor: app.test.tsx + game.spec.ts driven by DEFAULT_ITEMS / row positions, not names
- vitest global timeout 120s (CI headroom for the ~350-agent world); routine tier-1 sweep
- README credit: prices.runescape.wiki + Jagex IP note

## Scope (out)
- Live price sync (forbidden by design), buy-limit mechanics (queued), >50 items

## Gates
- [x] Generator clean: 48 items, 48/48 icons, catalog committed as generated snapshot
- [x] All suites green catalog-agnostically (87 + 6) — balance gate passed with NO sweep needed; one test premise fixed (1gp real spreads make bid+1 cross)
- [x] CI + live verification on push (below)

**Closed:** 2026-06-10 — done condition met.
