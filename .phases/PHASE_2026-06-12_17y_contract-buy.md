# Phase: Exchange Wars — Phase 17y: Make Quartermaster contracts actionable (buy the shortfall) (Brick 259)

**Started:** 2026-06-12
**Hat:** Builder (trading — turn "need N more" into one click)
**Goal:** On a not-yet-ready contract, replace the disabled "deliver" with a "buy {N}" button that loads the
contract item into the ticket — so you can acquire the shortfall in a click, the contract sibling of the
event-chip jump (15l) and the gear best-buy jump (14z).
**Done condition:** A not-ready contract shows "buy {shortfall}" that loads the item; a ready contract still
shows "deliver"; suite + e2e green.

## Why this brick
The Quartermaster pays a premium to DELIVER goods, and the board already shows the premium % + a disabled
"deliver" with a "need N more in inventory" tooltip — but there's no path from "I need more" to acquiring
them; you'd hunt the item manually. Making the not-ready state a "buy {N}" button that loads the item into
the ticket (the board sits on the Exchange tab beside the ticket) closes the see→acquire→deliver loop, the
same actionability the event chips (15l) and the gear best-buy (14z) already have.

## Design — a contextual button + an onSelect thread
- `ContractsBoard.tsx`: optional `onSelect?: (itemId) => void`. The action button: ready → "deliver"
  (fulfillContract); not-ready + onSelect → "buy {qty−have}" → `onSelect(c.itemId)` (loads the item);
  not-ready + no onSelect → the existing disabled "deliver" (fallback for callers without onSelect).
- `App.tsx`: pass `onSelect={(id) => { setSelected(id); pickRoom('exchange'); }}` (mirrors the event-chip
  jump; pickRoom is a no-op since the board is already on the Exchange, but keeps it robust).

## Scope (in)
- `ContractsBoard.tsx`: `onSelect` prop + the contextual buy/deliver button
- `App.tsx`: pass `onSelect`
- `app.test.tsx`: a not-ready contract's "buy {N}" calls onSelect with the item; a ready one delivers

## Scope (out)
- No auto-buy (loads the ticket; you confirm the buy) — same restraint as the gear best-buy; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/ContractsBoard.tsx
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] not-ready contract → "buy {N}" loads the item (onSelect); ready → "deliver" (fulfillContract); no-onSelect fallback unchanged
- [x] UI suite (424, +1 new + 1 updated App test for the new buy-state) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the established load-the-item jump pattern (15l/14z).
