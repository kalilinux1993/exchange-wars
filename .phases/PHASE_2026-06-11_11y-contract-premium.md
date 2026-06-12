# Phase: Exchange Wars — Phase 11y: Contract Premium & Ready Flag (Brick 103)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (Quartermaster — surface which contract is the best deal)
**Goal:** Show each contract's premium over the current market price, and flag contracts you can fill right now. UI-only, live on main.
**Done condition:** pure `contractPremium`; board shows "+X%" per contract + a ready row flag; suite + e2e green. **MET.**

## Outcome
- `components/ContractsBoard.tsx`: `contractPremium(unitPrice, marketPrice)` → `(unitPrice−market)/market` or null. Each row shows the premium "(+22%)" (green / red when the market spiked above the deal). Fillable contracts get a "✓ " prefix + `.contract.ready` class.
- `styles.css`: `.contracts li.contract.ready` faint-green tint.
- Reads `view.markets` lastPrice (premium reference) + `view.inventory` (readiness) — both already in the view.
- Tests: pure `contractPremium` (+0.2, −0.1, null) + render (premium "+20%" shows, fillable row flagged). 278/278 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #137.

## Gates
- [x] contractPremium fraction over market, null without mark (pure test)
- [x] Premium + ready flag render (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
