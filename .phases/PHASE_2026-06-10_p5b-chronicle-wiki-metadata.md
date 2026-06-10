# Phase: Exchange Wars — Phase 5b: Chronicle & Wiki Metadata

**Started:** 2026-06-10
**Hat:** Builder (standing directive; compact iteration)
**Goal:** News history (Chronicle panel: event begins/ends headlines, persisted), and wiki metadata plumbed through the catalog (snapshot price + GE buy limit shown in the ticket; limit MECHANIC stays queued).
**Done condition:** Chronicle logs event lifecycle deterministically (capped 12, persisted, unit-tested incl. expiry); generator emits wikiPrice/buyLimit; regen-fresh catalog passes all gates (sweep on red — tests are catalog-agnostic now); ticket shows wiki line; CI green; live verified.

## Scope (in)
- genCatalog emits `wikiPrice` + `buyLimit` (ItemDef optional fields); fresh regen
- game.ts: NewsEntry/seenEvents tracking + `updateNews` (called from refreshProgress); NewsLog "Chronicle" panel under the market
- TradeTicket: wiki snapshot price + GE limit line for the selected item
- Tests: updateNews unit (begin/end/cap), Chronicle boot render, e2e assert

## Scope (out)
- Buy-limit mechanic (queued — needs per-player purchase windows in engine), real-time price overlay column

## Gates
- [x] All gates green on regen'd catalog — 89 unit + 6 e2e. Routine regen toll landed on tier 3 this time; swept to cadence 5. Big finding: real staples compressed automation margins ~5× and made tier-3's vol ceiling inert (FINDINGS #31, design lever queued)
- [x] CI + live verification on push (below)

**Closed:** 2026-06-10 — done condition met.
