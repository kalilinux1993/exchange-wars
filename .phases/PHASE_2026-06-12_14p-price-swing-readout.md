# Phase: Exchange Wars — Phase 14p: Realized Price-Swing Readout (Brick 172)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — market decision-support)
**Goal:** Quantify how much the selected item's price has ACTUALLY swung lately — the
live counterpart to its static volatility tier — so a flipper sees when a spread is too
choppy to trust before committing.
**Done condition:** The TradeTicket shows a "recent: lo–hi · swing X% · 🟢/🟡/🔴" line
under the sparkline, computed from the same recent-trades window the chart draws; suite +
e2e green.

## Why this brick
The ticket shows a STATIC volatility tier (staple/big-staple/exotic, from `def.volatility`)
and a sparkline shape — but no NUMBER for how wild the item is trading right now. A flip
banks on the spread holding until both legs fill; on a wildly-swinging item the spread can
evaporate first. The realized swing (peak-to-trough over the recent window) names that
risk. Variety pick: branches back to the market core after three RPG bricks (14m/14n/14o).

## Design — pure helper + one readout line
- `priceSwing(prices)` (game.ts, pure, near `breakEvenSell`): scans the recent-trade price
  array for lo/hi, `swingPct = (hi − lo) / lo`, and a qualitative `read`: `steady` (<4%),
  `choppy` (<10%), else `wild`. `< 2` points → `null` (no readout — can't read swing from
  one trade). Reuses the SAME `recentPrices` the Sparkline consumes (no new data).
- TradeTicket: render the line right under `<Sparkline>` — "recent: {lo}–{hi} · swing {pct}% ·
  {🟢 steady / 🟡 choppy / 🔴 wild}", titled to explain it's the live counterpart to the tier
  and why a wild swing endangers a flip.

## Scope (in)
- `game.ts`: `priceSwing` helper + `PriceSwing` interface
- `TradeTicket.tsx`: import + readout line
- `app.test.tsx`: `priceSwing` unit + a ticket render assertion

## Scope (out)
- No engine change (realized swing is read from the existing trades window)
- No change to the static volatility tier display, the sparkline, or order placement
- No std-dev/OHLC candle (range is the honest, legible metric; deeper stats deferred)

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/TradeTicket.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `priceSwing` unit test (lo/hi/pct/read bands; <2 points → null)
- [x] ticket render shows the swing line (recent 100–140 · swing 40% · 🔴 wild); omits it at <2 trades
- [x] UI suite (297, +3) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Outcome
- `game.ts`: `priceSwing` + `PriceSwing` interface (pure, near `breakEvenSell`).
- `TradeTicket.tsx`: a "recent lo–hi · swing X% · 🟢/🟡/🔴" line under the sparkline; the
  read word goes green (steady) / red (wild) / neutral (choppy).
- Tests (+3): `priceSwing` unit (null at <2, bands at 3/6/40%); ticket render shows the line
  for `[100,140,110]`, omits it for `[100]`.

## Open questions
- Threshold calibration (4%/10%) is a first cut; revisit if it mislabels common staples.
