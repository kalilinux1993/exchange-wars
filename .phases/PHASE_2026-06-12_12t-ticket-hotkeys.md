# Phase: Exchange Wars — Phase 12t: Ticket Side Hotkeys (Brick 124)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (input/UX — finish the keyboard-trading flow started in 12g)
**Goal:** `b` / `s` pick the trade ticket's buy/sell side, so the trade loop is fully keyboard-driven. UI-only, live on main.
**Done condition:** b/s toggle the ticket side, gated to the Exchange tab and ignored while typing; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12g gave the market table j/k row nav (selecting a row loads the ticket). The missing link to a hands-on-keyboard trade was picking the side — you still had to mouse the buy/sell toggle. `b`/`s` close that: j/k pick the item → it loads → b/s pick the side → type price/qty → Enter (already) submits.

## Outcome
- `TradeTicket.tsx`: an `active?` prop + a window keydown listener (same shape as MarketTable's 12g nav — gated on `activeRef`, ignored on INPUT/SELECT/TEXTAREA/BUTTON/contentEditable) that sets the side on `b`/`s`. The `.sides` toggle got a "or press b / s" title for discoverability.
- `App.tsx`: passes `active={room === 'exchange'}` so the keys never fire on the hidden (still-mounted) ticket on other tabs.
- Tests (+1): App-level — press `s` → the sell side button is `active`; press `b` → buy is `active`. 342/342 unit, 9/9 e2e. FINDINGS #158.

## Gates
- [x] b/s toggle the side; gated to active tab; ignored in inputs (render test)
- [x] Typecheck + 342 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Optional: a global Enter-to-submit (left out — Enter already submits when focused in the ticket, and a global submit risks accidental orders).
