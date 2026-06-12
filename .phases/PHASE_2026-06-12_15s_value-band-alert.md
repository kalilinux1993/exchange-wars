# Phase: Exchange Wars — Phase 15s: Value-Band "Buy the Dip" Alert (Brick 201)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — alerts / value-investing surface)
**Goal:** Let the player arm a per-item alert that fires when a watched item enters the CHEAP third of
its cost→value band — a fundamental-relative, self-adjusting buy signal, distinct from the absolute
buy-below price alert (no threshold to maintain; it re-evaluates as fundamentals shift).
**Done condition:** A 🟢 toggle on each banded watchlist row arms a "cheap" alert; when that item's
last price enters the cheap band it fires a one-shot toast (re-arms when it leaves cheap); suite + e2e green.

## Why this brick
The alert system covers absolute price thresholds: buy-below (≤ X) and sell-above (≥ X), both requiring
the player to pick and maintain a number. A value investor's actual question is "tell me when this is
cheap *relative to what it's worth*" — which the cost→value band already answers (`valueBand` → cheap/
fair/rich). A band alert needs no threshold and self-adjusts: arm it once and it fires whenever the item
dips into its cheap third, however the fundamentals move. It's the notification half of the value-band
work (market track 15f, mood 15g, watch readout 15i, positions 15o, sortable column 15q) — turning a
passive readout into an active "buy the dip" signal. Breadth pivot away from the ticket.

## Design — a third alert type, same one-shot/re-arm pattern
- `game.ts`: `bandAlertHit(def, lastPrice): boolean` = `valueBand(def, last) === 'cheap'` — thin, testable
  single source (mirrors `alertHit`), so App and any future caller agree on "is it cheap?".
- `App.tsx`: `bandAlerts` pref (`Record<string, boolean>`, key 'ew-band-alerts') + a `bandFired` re-arm
  Set + `setBandAlert(id, on)`. In `refreshProgress`, after the sell-alert loop: for each armed id, fire a
  one-shot "🟢 {name} is cheap" toast when `bandAlertHit` is true and not already fired; clear the fired
  flag when it leaves the cheap band (re-arm) — the exact pattern the price alerts use.
- `WatchlistPanel.tsx`: `bandAlerts` + `onToggleBandAlert` props; a 🟢 toggle button (aria-pressed) on each
  row that HAS a band (`bandPosition !== null`), beside the ≤/≥ inputs.

## Scope (in)
- `game.ts`: `bandAlertHit`
- `App.tsx`: bandAlerts state/setter/fired-ref + the check loop + WatchlistPanel props
- `WatchlistPanel.tsx`: the 🟢 toggle (banded rows only)
- `app.test.tsx`: `bandAlertHit` unit + a WatchlistPanel toggle render/click test

## Scope (out)
- No threshold/number for the band alert (the band IS the trigger); no "rich/offload" alert this brick
  (sell-side take-profit is already covered by sell-above); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/src/components/WatchlistPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `bandAlertHit` true exactly in the cheap third (reuses `valueBand`'s thresholds)
- [x] a 🟢 toggle on a banded watch row arms/disarms via `onToggleBandAlert` (aria-pressed; green when on)
- [x] UI suite (348, +2: `bandAlertHit` unit + WatchlistPanel toggle) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the price-alert one-shot/re-arm pattern and `valueBand`.
