# Phase: Exchange Wars — Phase 10j: The Suggested Flip (Brick 62)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (the trading read that turns info into a decision)
**Goal:** A suggested-flip line in the ticket — buy (bestBid+1), sell (bestAsk−1), margin per unit after the 2% tax (green/red), with chips to load either side. Pure derived, no engine change.
**Done condition:** flip line + load chips + margin shipped with a test; suite + e2e green. **MET.**

## Outcome
- TradeTicket: flipBuy/flipSell/flipMargin from market view + GE_TAX_RATE; .flipline with two load chips + signed /ea margin.
- 202/202 unit (rested spread 100/200 → buy 101 / sell 199; chip loads price 101); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #96.

## Gates
- [x] Flip prices correct + chip loads the form (test)
- [x] Suite + e2e green
