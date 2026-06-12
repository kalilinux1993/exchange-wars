# Phase: Exchange Wars — Phase 14z: Click-to-Buy the Upgrade Advisor (Brick 182)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — readout→action)
**Goal:** Turn the 14v "best buy" recommendation from a name you read into a one-click action:
tap it to jump to the Exchange with that item loaded in the ticket, ready to buy.
**Done condition:** The GearManager best-buy line has a "→ buy" chip that selects the item +
switches to the Exchange tab; suite + e2e green.

## Why this brick
14v names the strongest affordable upgrade, but acting on it meant manually switching tabs and
finding the item among 128. The readout→action pattern (the one that made 14s cut-losers
valuable) closes that gap: the advice becomes a button. A recommendation you can't act on in one
gesture is half a feature.

## Design — thread one callback, additive chip
- `onBuy(itemId)` flows App → ExpeditionPanel → GearManager. App's handler is `setSelected(id) +
  pickRoom('exchange')` (both already exist) — land on the Exchange with the item in the ticket.
- GearManager: when `onBuy` is provided, append a "→ buy" chip to the existing best-buy line
  (additive — the static text is unchanged; the chip is the new affordance). Gated on `onBuy`, so
  render sites without it (tests) are unaffected.

## Scope (in)
- `App.tsx`: `onBuy={(id) => { setSelected(id); pickRoom('exchange'); }}` on ExpeditionPanel
- `ExpeditionPanel.tsx`: optional `onBuy` prop, forwarded to GearManager
- `GearManager.tsx`: optional `onBuy` prop + the "→ buy" chip
- `app.test.tsx`: the chip calls `onBuy` with the picked item id

## Scope (out)
- No auto-buy (it loads the ticket; the player still places the order — same respect-the-player
  stance as 14s's two-tap and 11u's prefill); no engine change

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/src/components/GearManager.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] the "→ buy" chip calls `onBuy(pick.itemId)`; the recommendation still shows but has no chip without `onBuy`
- [x] UI suite (320, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Note
- `exactOptionalPropertyTypes` rejected forwarding the optional `onBuy` callback through a layer;
  widened GearManager's prop to `((id)=>void) | undefined` (the standard fix for forwarding an
  optional prop), rather than spread-conditionally in JSX.

## Open questions
- None — pure callback threading over the existing advisor + select/room plumbing.
