# Phase: Exchange Wars — Phase 11d: One-Click Flip (Brick 82)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (core-loop UX — operationalize the Best Flips strip)
**Goal:** Clicking a Best-Flips row should leave the player with a ready-to-submit buy order (select + prefill buy @ bid+1), not just a selected item. UI-only, no engine change.
**Done condition:** TopFlips passes the buy price through its callback; App prefills the buy leg via `onLevel`; click test asserts `(id, buyPrice)`; suite + e2e green. **MET.**

## Outcome
- `components/TopFlips.tsx`: `onSelect` widened to `(id, buyPrice)`; row onClick passes `(f.id, f.buy)`; tooltip reworded ("click to load a buy @ … → then sell @ …").
- `App.tsx`: TopFlips `onSelect={(id, buy) => { setSelected(id); onLevel('buy', buy); }}` — routes the buy price into the existing prefill mechanism. No qty prefill (size is the player's call); no auto-submit (loads, doesn't place).
- Tests: updated the TopFlips click test to assert `onSelect('gold_bar', 1001)` (bid+1). The onLevel→ticket prefill path is already covered (ladder-click test, line 180), so App wiring is covered by composition. 250/250 unit, 9/9 e2e. No engine change, no fn redeploy. FINDINGS #116.

## Gates
- [x] Click passes id + buy price; lands a ready buy in the ticket (component test + composed coverage)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
