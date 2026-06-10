# Phase: Exchange Wars — Phase 5d: GE Buy Limits

**Started:** 2026-06-10
**Hat:** Builder (queue top while Phase 6 awaits Supabase keys)
**Goal:** Real GE buy limits as a mechanic: per-player, per-item purchase windows (4,000 ticks) using the catalog's real `buyLimit` values, enforced at the command layer (players + their automation; NPCs unaffected).
**Done condition:** placing a buy counts its qty against the item's window; over-limit placements reject with 'buy-limit'; windows reset after 4,000 ticks; items without a limit are unlimited (fixtures/old saves unaffected); view exposes `buyRemaining`; ticket shows limit-left; all gates green (sweep on red); CI + live.

## Scope (in)
- `AgentState.buyWindows` (players, plain JSON, migrates as absent=fresh); TUNING.buyLimitWindowTicks = 4000
- applyCommand 'place' buy-side enforcement: count at PLACEMENT, no refund on cancel (anti-gaming; documented divergence from OSRS fill-counting)
- MarketView.buyRemaining (null = unlimited); ticket "limit left" line
- Tests: counting, rejection, window reset, unlimited fallback, view exposure

## Scope (out)
- Fill-based counting (placement-counting is stricter + simpler), catalog regen (none — limits already in data), Phase 6 login (blocked on keys)

## Gates
- [x] All gates green (91 + 6) — NO sweep needed: staples limits never bind bot-scale flipping; only concentrated exotic plays hit limits (as designed)
- [x] CI + live on push (below)

**Closed:** 2026-06-10 — done condition met.
