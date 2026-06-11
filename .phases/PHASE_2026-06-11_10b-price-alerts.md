# Phase: Exchange Wars — Phase 10b: Price Alerts (Brick 54)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (make the passive watchlist active)
**Goal:** A "buy below" threshold per watched item; fires a one-time toast + 🔔 row highlight when price drops to it, re-arms when it climbs back. localStorage. No engine change.
**Done condition:** alert input + latched toast + triggered row shipped with a test; suite + e2e green. **MET.**

## Outcome
- game.ts loadAlerts/saveAlerts ('ew-alerts', id→threshold). App: alerts state + alertFired ref (latch), setAlert (persist + re-arm); detection in refreshProgress (per-tick cadence, not render).
- WatchlistPanel: ≤ threshold input per row; 🔔 + .alerted highlight while triggered.
- 198/198 unit (always-met threshold → row alerted after +1k); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #88.

## Gates
- [x] Alert fires once / latches (ref Set; re-arm on cross-back + on edit)
- [x] Suite + e2e green
- [note] 5th localStorage pref — usePref dedupe now overdue.
