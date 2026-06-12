# Phase: Exchange Wars — Phase 15o: Value-Band on Open Positions (Brick 197)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — sell-side decision support)
**Goal:** Flag which HOLDINGS are rich (ripe to offload) vs cheap on the Open Positions panel — a
value-band tag beside each position's mark, the sell-side complement to cost-based P&L.
**Done condition:** Each marked position shows a 🟢/⚪/🟡 value-band tag next to its mark price;
suite + e2e green.

## Why this brick
The Positions panel shows P&L (profit vs YOUR cost) but not where a holding sits in its fundamental
band — and those are different sell signals: a position can be in profit yet still cheap (more
upside) or in profit and rich (near its ceiling, ripe to sell). The value-band on your actual
holdings answers "which of these should I offload?". Reuses `valueBand` (15f) — its application to
the SELL surface (after market browse, watchlist, mood). Also: this turn's toast-system review found
the celebration toasts temporally separated / correctly ordered (no clobbering) — no fix needed.

## Design — band tag in the avg→mark cell
- `defOf = new Map(items.map(i => [i.id, i]))`; for a marked position, append
  `valueBand(defOf.get(itemId), p.mark)` as a compact 🟢/⚪/🟡 next to the mark, titled hold/offload.

## Scope (in)
- `PositionsPanel.tsx`: `valueBand` import + `defOf` + the band tag
- `app.test.tsx`: a held position trading rich shows the 🟡 band tag

## Scope (out)
- No auto-sell-winner action (cut-losers already covers stop-loss; take-profit stays a judgment call);
  no engine change

## Subsystems touched
- packages/ui/src/components/PositionsPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] a position trading near its ceiling (mark 190 in band 100..200, pos 0.9) shows 🟡 (rich)
- [x] UI suite (340, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuse `valueBand`.
