# Phase: Exchange Wars — Phase 12m: Wealth Composition (Brick 117)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (trading — the liquidity lens: split net worth into cash / offers / goods)
**Goal:** A Wealth panel showing net worth split by liquidity (cash on hand vs gp escrowed in resting buy offers vs goods held at liquidation value), plus an "at risk in the wild" note for active-expedition loot. UI-only, live on main.
**Done condition:** composition bar + %s summing to net worth; expedition loot shown as at-risk (outside worth); pure helper tested (split sums to total, residual clamp); suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12k split HOLDINGS by item (concentration). This is the level above: how your whole net worth splits by LIQUIDITY — are you flush with cash, over-committed in buy offers, or sitting on hard-to-move goods? A different decision ("am I liquid enough?") over a different scope (all of worth, not just holdings).

## The exact-by-construction trick
`netWorth` (engine, report.ts:11) = cash + buy escrow + (inventory+sell-escrow valued at a bid-walk). Rather than re-derive the bid-walk in the UI (duplication, drift), the split takes cash (`view.gp`) and buy escrow (`Σ remaining×price` over resting buys) straight off the view and computes **holdings as the residual** `total − cash − buyOrders`. So the three parts sum to `playerWorth` EXACTLY without re-implementing the valuation — the one number I can't easily reproduce (bid-walk) is the one I derive by subtraction. Note `netWorth` excludes expedition loot, so that's shown separately as "at risk", honestly outside the worth total.

## Outcome
- `game.ts`: `worthBreakdown(view, total)` → `{cash, buyOrders, holdings, total}`, pure; holdings = clamped residual.
- `components/WealthPanel.tsx`: a stacked composition bar (cash gold / offers teal / goods orange, reusing 12k's `.allocbar`) + "X% cash · Y% in offers · Z% in goods", with "⚔ N at risk in the wild" when a dive is live. Empty state at zero worth.
- `App.tsx`: mounted in the Exchange room under PlayerPanel.
- Tests (+3): `worthBreakdown` (split + sums-to-total; negative-residual clamp) + a WealthPanel render (cash 50% / offers 10% / goods 40%). 329/329 unit, 9/9 e2e. FINDINGS #151.

## Gates
- [x] `worthBreakdown` pure (residual + clamp + sums to total)
- [x] WealthPanel renders the composition (render test)
- [x] Typecheck + 329 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Trend the composition over time (are you getting more/less liquid?).
- A "free slots / cash to deploy" nudge when cash share is very high.
