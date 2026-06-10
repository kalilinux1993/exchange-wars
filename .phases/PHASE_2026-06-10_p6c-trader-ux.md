# Phase: Exchange Wars — Phase 6c: Trader UX & Catalog VII

**Started:** 2026-06-10
**Hat:** Builder (standing directive)
**Goal:** Ladder levels are clickable (ask → buy ticket at that price; bid → sell), the Ledger shows total satchel value, and the catalog grows to 56 (16 exotics).
**Done condition:** clicking any depth level prefills the ticket's side+price (test-gated); satchel total renders; regen at --exotics 16 passes all gates (sweep on red); CI + live.

## Scope (in)
- BookLadder onLevel callback; TradeTicket prefill prop (side+price, nonce-applied); App wiring
- PlayerPanel satchel-value total
- `gen:catalog -- --staples 40 --exotics 16` regen + gates/sweep

## Scope (out)
- Leaderboards (await Supabase finisher confirmation), chart axis work

## Gates
- [x] Suites + e2e green — 95 + 6; regen toll swept (tier 1 → cadence 9); React-bailout test bug fixed (FIRST-row click needs a bounce)
- [x] CI + live on push (below)

**Closed:** 2026-06-10 — done condition met.
