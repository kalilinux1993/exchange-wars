# Phase: Exchange Wars — Phase 14s: "Cut a Loser" One-Tap Market Sell (Brick 175)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading action, not just a readout)
**Goal:** Let the player exit a losing position straight from the portfolio view — a
two-tap (arm → confirm) market-sell of the whole position at the best bid.
**Done condition:** Underwater PositionsPanel rows show a "✂ cut" chip that arms on the
first tap and, on confirm, issues a sell-the-whole-position command at bestBid; suite +
e2e green.

## Why this brick
The game is rich in readouts but thin on one-tap ACTIONS. 13n surfaces underwater
positions (the loss callout + red rows); the natural next step is letting you DO something
about them without navigating to the ticket, setting side/qty/price, and submitting. "Cut
losers" is a real risk-management verb. Fresh emphasis (an action) after a run of readout
bricks.

## Design — two-tap arm/confirm, instant market sell via the command path
- PositionsPanel gains an optional `onCommand` (threaded from App's existing `command`).
  Underwater rows (`p.marked && p.unrealized < 0`) get a "✂ cut" chip. First tap ARMS it
  (row-local `armed` state); the chip becomes "confirm ✓" (red). Confirm issues
  `{ type:'place', itemId, side:'sell', price: bestBid ?? mark, qty: units }` — a market sell
  that takes the best bid and rests any remainder — then disarms.
- The button `stopPropagation`s so it never triggers the row's load-in-ticket `onSelect`.
- Gated on `onCommand` being passed, so existing `onSelect`-only render sites are unchanged.

## Why two-tap, not one-tap (the safety call)
A one-tap sell books a realized loss irreversibly (no undo in this game), and the positions
list is dense and updates every tick — a mis-tap would lock a loss. Two-tap arm/confirm on
the SAME chip is the minimal guard, mirroring how the existing "sell whole position" (11u)
is a prefill-then-submit (never instant). Selling at bestBid (not below) is the honest
"take the best available" semantics — it won't tank the price by dumping at the floor.

## Scope (in)
- `PositionsPanel.tsx`: `onCommand` prop + `armed` state + the cut chip + bestBid lookup
- `App.tsx`: pass `onCommand={command}` to PositionsPanel
- `styles.css`: `.chip.cut.armed` red treatment
- `app.test.tsx`: arm→confirm issues the right command + stops the row select; no button without onCommand

## Scope (out)
- No new engine command (reuses `place`); no market-order type
- No partial-fill cleverness (rest the remainder, as any sell does); no auto-cancel of the rest

## Subsystems touched
- packages/ui/src/components/PositionsPanel.tsx
- packages/ui/src/App.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] arm→confirm issues `place sell @ bestBid(78), qty=units(10)`; first tap does NOT sell
- [x] cut chip stops the row's `onSelect`; absent when `onCommand` not passed
- [x] UI suite (304, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Sticky-armed across rows is left as-is (re-arming another row just moves the armed id) — a
  minor footgun deemed acceptable for MVP; could auto-disarm on row-select if it bites.
