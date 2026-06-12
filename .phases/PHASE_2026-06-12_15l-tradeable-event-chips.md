# Phase: Exchange Wars — Phase 15l: Tradeable Event Chips (Brick 194)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — readout→action + iconography)
**Goal:** Make the active-event strip ACTIONABLE — click a "⚡ {item} {kind} · N left" chip to jump
to that item in the ticket and trade the event (the Storm-Trader play) — and show its real icon.
**Done condition:** Each active-event chip is a button that selects its item + switches to the
Exchange, with the item's `ItemIcon`; suite + e2e green.

## Why this brick
The active-event strip tells you a shortage/craze/glut/slump is live on an item (with time left),
but you can't ACT on it without manually finding that item — yet trading during an event is the
whole point (the "Storm Trader" deed). Making the chip a button that loads the item closes the
loop: see the event → one click → trade it. The readout→action pattern (14z/15-cut/15-buy) applied
to events. Pairs with the 15j/15k icon work (the chip showed a bare name).

## Design — chip → button, reuse setSelected/pickRoom + ItemIcon
- The event chip becomes a `<button className="event-chip {kind}">` with
  `onClick={() => { setSelected(e.itemId); pickRoom('exchange'); }}` — the same select+navigate the
  Delve-Log jump and best-buy chip use. Add the item's `ItemIcon` (App gains the import + a `wikiOf`
  built beside the strip's existing `names`).
- `.event-chip` gains `cursor: pointer; font-family: inherit; color: inherit` so the button matches
  the old span (the colored kind-variants already set their own color).

## Scope (in)
- `App.tsx`: chip → clickable button + `ItemIcon` + `wikiOf`
- `styles.css`: `.event-chip` button reset
- `app.test.tsx`: an active event renders a clickable chip with the icon; clicking selects the item

## Scope (out)
- No change to the event mechanic, the selected-item event status, or the Chronicle; no engine change

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] active-event chip is a button with the item `ItemIcon`; clicking it loads the item (ticket header shows "Offer · {item}")
- [x] UI suite (337, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuse the navigate primitives + ItemIcon.
