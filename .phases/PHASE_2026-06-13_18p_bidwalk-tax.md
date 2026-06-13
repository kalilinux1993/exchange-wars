# Phase: Exchange Wars — Phase 18p: bidWalk nets the sell tax (the loot-dump readout overstated) (Brick 276)

**Started:** 2026-06-13
**Hat:** Reviewer → Builder (continue the reference-verify seam: another UI↔engine prediction desync)
**Goal:** `bidWalk` predicts instant-sell proceeds (the PlayerPanel "sell @ bid" loot-dump), but returned
only GROSS (`gp` = Σ take·price) while the engine taxes every sell (`paySeller`, exchange.ts:72-75: seller
gets `proceeds − floor(proceeds·0.02)`, per fill). The readout "bids pay ≈{gross}" overstated what you
RECEIVE by ~2% — and contradicted the TradeTicket, which already shows sells "after 2% tax". Add `net`
(per-fill floored tax, mirroring `paySeller`) and show it.
**Done condition met:** yes — `bidWalk` returns `net` (per-fill after-tax); the loot-dump shows "realize
≈{net} gp"; the realized gp on a dump EQUALS the displayed net; suite + e2e green.

## Why this brick
Continuing the seam that found 18g/18o: UI helpers that PREDICT engine outcomes can silently desync. `bidWalk`
feeds the one-click loot dump ("sell @ bid") and the satchel total — both showed the GROSS bid value as what
you'd get, but the engine taxes the seller 2% per fill (`paySeller`, floored per matched bid, exchange.ts:166).
So a player dumping loot saw an inflated figure and received ~2% less, while the very next panel (the ticket)
correctly netted its sells. A "what you'll realize" number that's wrong toward MORE is a real papercut at the
decision point. Verified the engine taxes per fill, so `bidWalk` floors per bid level to match exactly.

## Design — add a per-fill net to bidWalk, show it
- `game.ts` `bidWalk`: alongside `gp` (gross), accumulate `net += proceeds − floor(proceeds·GE_TAX_RATE)`
  per matched bid (exactly `paySeller`'s per-fill flooring); return `{qty, floor, gp, net}`.
- `PlayerPanel.tsx`: the per-item "bids pay ≈{gp}" → "realize ≈{net} gp" (after-tax tooltip); the satchel
  total → "satchel, after tax" summing `net`. `gp` (gross) kept on the return for any bid-side caller.

## Scope (in)
- `packages/ui/src/game.ts`: `bidWalk` `net` field
- `packages/ui/src/components/PlayerPanel.tsx`: show `net` (realize after tax) in both spots
- `packages/ui/test/app.test.tsx`: 2 bidWalk units (net=gross−tax, net<gross; per-fill flooring) + updated the spoils test to assert display==actual receipt (3,626 net)

## Scope (out)
- `gp` (gross) UNCHANGED on the return (no caller relies on it being net); no engine change (it already taxes); no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/PlayerPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `bidWalk.net` = gross − per-fill floored 2% tax (mirrors paySeller); shown as "realize ≈N gp"
- [x] the spoils dump's realized gp EQUALS the displayed net (3,626) — display matches the engine
- [x] UI suite (448, +2) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — verified against paySeller (exchange.ts:72-75/166); per-fill flooring matches the engine exactly.
