# Phase: Exchange Wars — Phase 4c: Catalog & Polish

**Started:** 2026-06-10
**Hat:** Builder (content + frontend polish; Jesse-directed: "more items, better UI")
**Goal:** Grow the economy from 5 to 14 items across price tiers and give the UI a quality pass (net worth + session profit, price sparklines, favicon), then redeploy the live site.
**Done condition:** 14-item catalog with ALL gates green (market anchoring + flipper profit now span 14 items; conservation/determinism/balance/longrun re-verified, re-tuned only if a gate fails); UI shows net worth + profit-since-start and per-item sparklines; e2e green; live site redeployed and serving the new build.

## Scope (in)
- catalog.ts: +9 OSRS-flavored items (coal, shark, law rune, magic logs, adamant bar, grimy ranarr, prayer potion, uncut dragonstone, rune platebody) with cost/value/volatility tiers (~95 agents total)
- UI header: net worth (gp + inventory + open-order value, computed view-side) + profit since game start (startGp stored in the save struct, no engine change)
- MarketTable: inline SVG sparkline per item from the engine's recent-trades window (read-only world access for display; mutations remain command-only — rule clarified in CLAUDE.md)
- Favicon (inline SVG gold coin), small CSS polish
- Test updates (jsdom item spot-checks; e2e additions), full gate re-verification, gh-pages redeploy

## Scope (out)
- New mechanics/upgrades, PWA/offline manifest, art-direction overhaul (still provisional), CI

## Subsystems touched
- packages/engine/src/catalog.ts (data only), packages/ui/* , CLAUDE.md (read-vs-mutate rule), tests

## Gates
- [x] All engine gates green with 14 items — suite 6.4s. The balance gate caught a REAL economy collapse (liquidity dilution, FINDINGS #21) and forced the root fix: speculators scale with catalog size. Bot hardening kept: exit-liquidity cap + per-tier volatility ceilings (#22); two seductive-but-wrong heuristics reverted on measurement (#23). Final curve: best ever (tier 3 avg +33.6k/+41.3k).
- [x] UI jsdom + e2e green — 72 unit + 5 browser
- [x] Live site redeployed (gh-pages)
- [x] Adversarial review: not gated (data + display + measured tuning; the balance/market gates carried the risk) — recorded

**Closed:** 2026-06-10 — done condition met.

## Open questions
- Suite runtime with ~95 agents (balance gate ×30 runs) — if >15s, trim balance gate seeds
