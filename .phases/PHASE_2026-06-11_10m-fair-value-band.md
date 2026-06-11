# Phase: Exchange Wars — Phase 10m: Fair Value Band (Brick 65)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (the positional trading read, complementing the tactical flip)
**Goal:** A cheap/fair/rich chip in the ticket showing where lastPrice sits in the item's [baseCost..consumeValue] band. Pure derived, no engine change.
**Done condition:** band chip shipped with a test; suite + e2e green. **MET.**

## Outcome
- TradeTicket: valuePos = clamp((last−baseCost)/(consumeValue−baseCost)); label cheap<34% / fair / rich>67%; chip in the flip line. Colours: cheap green, rich gold (not red), fair dim.
- 204/204 unit (lastPrice at baseCost → cheap; at consumeValue → rich); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #99.

## Gates
- [x] Band reads cheap/rich at band extremes (test)
- [x] Suite + e2e green
