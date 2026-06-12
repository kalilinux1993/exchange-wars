# Phase: Exchange Wars — Phase 14j: Net Worth Counts Equipped Gear (engine fix) (Brick 166)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (engine — a real worth bug surfaced by the equipment work)
**Goal:** Equipping gear must not drop your net worth (and leaderboard score).
**Done condition:** `netWorth` counts `agent.worn` at liquidation value; equip is worth-neutral; sim byte-identical; suite green; engine.js rebuilt; redeploy flagged. **MET.**

## Why this brick
Investigating the equipment manager (14h), found that `netWorth` (report.ts) counts gp + buy-escrow + inventory holdings + sell-escrow but NOT `agent.worn`. Equipping moves an item inventory→worn, so equipping a valuable piece DROPPED your net worth by its liquidation value — and the leaderboard score with it. An oversight from when `worn` was added (13e): the UI worth helpers and `checkInvariants` count worn, but `netWorth` was never updated. Your equipped gear is your wealth; equipping shouldn't make you look poorer.

## Design — count worn like inventory, at liquidation value
- `netWorth`: before walking the bids for each item, add worn copies to the quantity (`if (agent.worn) for (id of Object.values(worn)) if (id === def.id) qty += 1`) — the SAME pattern invariants.ts uses for the conservation count. Worn gear is then valued by the resting bids exactly as inventory holdings are.

## Outcome
- `report.ts`: `netWorth` counts worn gear.
- `engine.js` rebuilt (worth is replay/leaderboard-affecting).
- Tests (+1, engine 142): a bid gives a held weapon value; `netWorth` is IDENTICAL before and after equipping it (worth-neutral).

## Gates
- [x] equip is worth-neutral; worn gear counted at bid value (engine test)
- [x] SIM byte-identical across seeds 42/11/1337 (`fe75df57`/`736171e3`/`01f213c1`), 0 rejected, invariants OK — the benchmark never equips, so its worth/report are unchanged
- [x] engine 142 (+1) + UI 289 + e2e 9 green; typecheck clean; engine.js rebuilt
- [x] **verify-score redeploy: replay-affecting (worth now includes worn) → joins the batch** (12b + 13d + 13e + 13f + 13r + 14j)

## Follow-ups
- WealthPanel lumps worn-gear value into "in goods"; a separate "kit" segment could distinguish equipped from satchel if desired.
