# Phase: Exchange Wars — Phase 6m: Catalog 76 & Ticket Tax Preview

**Started:** 2026-06-10
**Hat:** Builder (content + trader UX)
**Goal:** Catalog 68→76 (52 staples + 24 exotics); TradeTicket warns live when a buy exceeds your gp or a sell exceeds your holdings.
**Done condition:** catalog regenerated; warnings render (advisory only — engine rejection path untouched, e2e depends on it); all gates green (two-leg sweep for any tier the re-roll breaks); CI + live bundle flipped.

## Scope (in)
- `npm run gen:catalog -- --staples 52 --exotics 24`
- TradeTicket: "exceeds your N gp" (buy) / "you hold only N" (sell) hints; submit stays enabled
- Unit test for both warnings
- Routine two-leg sweep if the balance gate reds (FINDINGS #25/#32/#34)

## Scope notes
- Original plan (tax/cost preview) was ALREADY SHIPPED in an earlier phase (ticket `.sums` line) — caught by reading before writing.

## Scope (out — explicit non-goals)
- Prestige/art/leaderboards (Jesse-gated); engine changes beyond TUNING re-locks

## Subsystems touched
- packages/engine/src/catalog.ts (GENERATED), packages/engine/src/agents.ts (TUNING only if sweep)
- packages/ui/src/components/TradeTicket.tsx, packages/ui/test/app.test.tsx

## Gates
- [x] typecheck + 108 unit + 6 e2e green — balance gate passed the re-roll with NO sweep (FINDINGS #37)
- [ ] CI green + live bundle verified (checked post-push)
