# Phase: Exchange Wars — Phase 11b: Profit by Item (Brick 80)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading analytics — "what worked", the reflective half of the loop)
**Goal:** Realized profit per item from the player's fills (FIFO cost basis, tax-netted), as a click-to-select panel. UI-only, no engine change.
**Done condition:** pure `realizedPnL(fills, taxRate)` (FIFO match, exclude open/orphan, sorted) with tests; `ProfitPanel` in the Exchange room; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `realizedPnL(fills, taxRate)` + `ItemPnL` — FIFO-matches sells against earlier buys in the fill window (naturally FIFO since fills are tick-ordered), splits partial lots, nets per-unit `price - floor(price*tax)`. Open positions and cost-basis-less sells contribute 0 soldUnits and drop out. Sorted profit-desc, id tie-break. Window-bounded ("recent", not lifetime).
- `components/ProfitPanel.tsx`: renders it Movers-style (reuses `.panel`/`.rows small`/`.mover`/`.pct`), profit up/down coloured + `fmtCompact`, click → onSelect; dim empty-state.
- `App.tsx`: `<ProfitPanel>` in the Exchange `.middle`, after MoversPanel.
- Tests: 3 pure `realizedPnL` (clean round-trip tax-netted; FIFO across lots with a loss leg; excludes open/orphan + sorts) + 2 component (winner row + click-selects; empty state). 248/248 unit (+5), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #114.

## Notes
- Settled the engine-content blocker: verifier takes only {handle,seed,log} (no claimed-hash → no hard reject), engine tests are self-consistent (no golden hashes). But shipping replay-affecting code to main without the coupled `supabase functions deploy` is a live-board inconsistency → still Jesse-gated. This brick stayed UI-only.

## Gates
- [x] realizedPnL FIFO/tax/exclusions/sort (pure tests)
- [x] Panel renders + selects on click; empty state (render tests)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
