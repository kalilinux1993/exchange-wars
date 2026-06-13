# Phase: Exchange Wars — Phase 21q: the flippable-spread alert (the 5th alert type) (Brick 335)

**Started:** 2026-06-13
**Hat:** Builder (trading — the one high-value feature left; build it with a defensible, tunable default)
**Goal:** The alert system has buy-below/sell-above (price) + cheap/rich (band) — but nothing that pings when
an item's SPREAD becomes profitable to flip right now. Add a per-item "flippable" alert. Previously flagged
for Jesse's threshold-model call; the standing build mandate + a defensible model (%-of-price) make it
shippable autonomously with a tunable default.
**Done condition met:** yes — `flipAlertHit(market)` (after-tax flipMargin ≥ a %-of-price floor) drives a 🔁
watch-row toggle + a one-shot toast, mirroring the band-alert pattern (pref + fired-set + re-arm +
swap-guard + toast-priority) EXACTLY; pure + 2 UI tests; suite 522 (+3), e2e 15, typecheck clean.

## Design (mirror the band alert 15s/16d — the 21k-review-verified pattern)
- `flipAlertHit(market, minPct=FLIP_ALERT_MIN_PCT)` in game.ts: `flipMargin(market) / lastPrice >= minPct`
  (false on a one-sided book / lastPrice ≤ 0). **Model = %-of-price** (cross-item comparable — a 1% net
  margin means the same on a 50gp staple and a 5,000gp item). `FLIP_ALERT_MIN_PCT = 0.01` — a defensible
  "solid flip" floor, a SINGLE tunable constant (Jesse can change the % or the model).
- `ew-flip-alerts` pref (Record<itemId,boolean> toggle); `flipFired` ref; `setFlipAlert` re-arms on toggle;
  `flipFired.current.clear()` in the swap-guard block; the fire loop after the rich-alert loop (informational
  tier, before celebrations). WatchlistPanel: a 🔁 toggle gated on `flipMargin(m) !== null` + `onToggleFlipAlert`.
- New WatchlistPanel props OPTIONAL (gate the toggle on `onToggleFlipAlert`) so existing render tests don't break.

## Scope (in)
- packages/ui/src/game.ts (`FLIP_ALERT_MIN_PCT` + `flipAlertHit`)
- packages/ui/src/App.tsx (pref, fired-set, setter, swap-guard clear, fire loop, WatchlistPanel wiring)
- packages/ui/src/components/WatchlistPanel.tsx (the 🔁 toggle + optional props)
- packages/ui/test/app.test.tsx (flipAlertHit units + WatchlistPanel toggle test)

## Scope (out — explicit non-goals)
- Per-item custom thresholds (one tunable global constant — clean UI like the band toggles); no engine change

## Gates
- [x] flipAlertHit: fires at/above the %-floor, false below / one-sided book / lastPrice 0 / custom-floor
- [x] 🔁 toggle arms/disarms; one-shot fire + re-arm; swap-guard clears flipFired; existing tests unbroken (omit-without-handler pinned)
- [x] typecheck clean; UI suite 522 (+3); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- FLIP_ALERT_MIN_PCT default 1% — flagged tunable; revisit with playtest data (Jesse) if too strict/noisy.
