# Phase: Exchange Wars — Phase 12a: Sell-Above (Take-Profit) Alerts (Brick 105)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading — complete the price-alert system with the exit half)
**Goal:** Add `≥` sell-above (take-profit) price alerts mirroring the existing `≤` buy-below alerts. UI-only, live on main.
**Done condition:** per-item sell-above alert (pref + firing toast + 🔔 indicator); buy path untouched; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `alertHit(last, threshold, dir)` (`below`=≤, `above`=≥) — one shared "is it hit" definition (at-threshold counts).
- `App.tsx`: `ew-sell-alerts` pref + `sellFired` re-arm latch + `setSellAlert` + a second firing loop ("≥ X — time to sell?"). Buy path left untouched (mirror, not refactor).
- `WatchlistPanel.tsx`: a `≥` input per item beside the `≤` one; 🔔 triggers on either via `alertHit`; both inputs got `aria-label`s (free a11y).
- Tests: pure `alertHit` truth table (at/under/over, both dirs) + a mirror of the buy-alert render test (sell threshold 1 → always-met → `.mover.alerted`). 281/281 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #139.

## Gates
- [x] alertHit both directions incl. at-threshold (pure test)
- [x] Sell alert fires + shows the 🔔 row (render test); buy path intact
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
