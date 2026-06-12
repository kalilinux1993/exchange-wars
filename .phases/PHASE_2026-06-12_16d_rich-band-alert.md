# Phase: Exchange Wars — Phase 16d: Value-Band "Take Profit" Alert (sell side) (Brick 212)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — alerts / value-band symmetry)
**Goal:** Complete the band-alert pair: a 🟡 "take profit" alert that fires when a watched item enters the
RICH third of its cost→value band — the sell-side complement to 15s's 🟢 buy-the-dip (cheap) alert, on the
same watchlist hub, threshold-free and self-adjusting.
**Done condition:** A 🟡 toggle on banded watch rows arms a "rich" alert; when that item's price enters the
rich band it fires a one-shot "🟡 {item} is rich — take profit?" toast (re-arms when it leaves rich); suite + e2e green.

## Why this brick
15s gave the buy signal (cheap band → "accumulate?") but the system is asymmetric — there's no sell signal.
A value investor wants "tell me when this is RICH relative to its worth" exactly as much as when it's cheap:
the take-profit half of the same threshold-free, self-adjusting trigger. Keeping it on the WATCHLIST (beside
the cheap toggle and the ≤/≥ price alerts) keeps every alert in one hub rather than splitting band-alerts
across panels — consistency beats putting the sell alert on a different surface. Mirrors 15s's exact pattern;
only the predicate (`'rich'` vs `'cheap'`) differs.

## Design — the 15s pattern, sell side
- `game.ts`: `richAlertHit(def, last)` = `valueBand(def, last) === 'rich'` — the sibling of `bandAlertHit`
  (15s); a named, tested single source so App + the toggle agree on "is it rich?".
- `App.tsx`: `richAlerts` pref (`Record<string, boolean>`, key 'ew-rich-alerts') + a `richFired` re-arm Set +
  `setRichAlert(id, on)`. In `refreshProgress`, after the cheap-band loop: one-shot "🟡 {name} is rich — take
  profit?" when `richAlertHit` is true and not fired; clear on leaving rich. Pass to WatchlistPanel.
- `WatchlistPanel.tsx`: `richAlerts` + `onToggleRichAlert` props; a 🟡 toggle beside the 🟢 cheap toggle on
  each banded row (same `bandPosition !== null` gate).

## Scope (in)
- `game.ts`: `richAlertHit`
- `App.tsx`: richAlerts state/setter/fired-ref + the check loop + WatchlistPanel prop
- `WatchlistPanel.tsx`: the 🟡 toggle (banded rows only)
- `app.test.tsx`: `richAlertHit` unit + a WatchlistPanel rich-toggle render/click test

## Scope (out)
- No held-only gating (a "rich" read is informational on any watched item — don't buy / if you hold, sell);
  no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/src/components/WatchlistPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `richAlertHit` true exactly in the rich third (reuses `valueBand`'s thresholds)
- [x] a 🟡 toggle on a banded watch row arms/disarms via `onToggleRichAlert` (aria-pressed; gold when on)
- [x] UI suite (361, +2: `richAlertHit` unit + WatchlistPanel rich-toggle) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the 15s cheap-alert pattern exactly; the band-alert pair is then complete.
