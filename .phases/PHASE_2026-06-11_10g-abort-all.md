# Phase: Exchange Wars — Phase 10g: Abort All (Brick 59)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading QoL — expose a latent engine capability)
**Goal:** An "abort all" button in the Ledger's Open offers that cancels every resting order at once. The engine already supports it (`cancel` with no args).
**Done condition:** button (shown at >1 order) + test; suite + e2e green. **MET.**

## Outcome
- PlayerPanel: "abort all" beside the Open offers heading (>1 order) → `{type:'cancel'}`. No engine change (cancelAgentOrders cancels all when unfiltered; escrow refunded).
- 201/201 unit (two resting buys → abort all → no open offers); 9/9 e2e. No fn redeploy. FINDINGS #93.

## Gates
- [x] Cancels all, button hides at ≤1 (test)
- [x] Suite + e2e green
- [next] Brick 60 = consolidation (round-number rule).
