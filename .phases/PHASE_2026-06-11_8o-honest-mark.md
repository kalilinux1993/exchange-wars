# Phase: Exchange Wars — Phase 8o: The Honest Mark (Brick 15)

**Started:** 2026-06-11
**Hat:** Builder/Tuner (scoring semantics — the FINDINGS #47/#48 sequencing says this lands before any bestiary tuning)
**Goal:** netWorth stops pricing holdings at lastPrice (paper marks rewarded hoarding: 636k routed lines were ~93% unsold loot). New mark: LIQUIDATION value — walk the resting bids excluding the agent's own orders (self-bid pump guard), take depth until the stack is consumed, unmatched remainder is worth 0 right now. Buy escrow stays face value (refundable cash); sell-escrowed units join the stack for marking.
**Done condition:** liquidation mark shipped with unit tests (walk, self-bid guard, remainder-0, sell-escrow); ALL existing gates re-verified (flipper-profit, balance medians, longrun — bid≈last on liquid staples is a hypothesis to TEST, not assume); audit re-measured for honest strategy numbers; fn redeployed; gates green.

## Scope (in)
- packages/engine/src/report.ts netWorth rewrite + new report.test.ts
- UI worth label/tooltip if it claims something now untrue
- tools/audit-grind.ts re-measure → FINDINGS #49 (the first honest strategy table)

## Scope (out)
- Bestiary/loot tuning (NEXT brick, against the honest numbers this phase produces)
- Tax-netting in the mark (gross liquidation is the consistent v1; document)

## Outcome
- Shipped: bid-walk liquidation mark in engine netWorth (own bids excluded; remainder 0); discovered + replaced the UI's SECOND lastPrice mark (viewNetWorth → playerWorth = engine netWorth; display and arbiter must be the same function); purse tooltip explains the mark.
- 167/167 (3 new report tests incl. self-bid pump guard); every balance/market gate held — bid≈last on liquid staples confirmed, zero TUNING touched.
- Honest re-measure exposed the next faucet: deep CACHES mint 15–19k gear at 25%/cache (5 rune full helms in a 14-kill run) — flee-everything cache farming beats fighting. Cache loot redesign queued (FINDINGS #49).
- fn rebuilt (71.6kb) + redeployed.

## Gates
- [x] New mark unit-tested incl. the self-bid exploit
- [x] Full suite green — if a balance/market gate flips, investigate before touching TUNING (the mark changed, not the economy) — nothing flipped
- [x] fn rebuild + redeploy (leaderboard worth semantics change)
