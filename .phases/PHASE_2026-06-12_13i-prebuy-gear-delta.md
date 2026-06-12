# Phase: Exchange Wars — Phase 13i: Pre-Buy Gear Delta (Brick 139)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — show upgrade value at the BUY point, finishing the buy-gear decision flow)
**Goal:** The trade ticket previews a gear piece's upgrade value before you place the buy order.
**Done condition:** when buying a gear item, TradeTicket shows "equips as ⚔/🛡 ±N {stat} vs your {worn}" (+ a "needs Atk N" note when under-level); UI suite + e2e green. **MET.**

## Why this brick
13h put the upgrade delta on gear ALREADY in the satchel — but the user BUYS gear on the order book (gear pieces are ordinary tradeable catalog items; there's no separate shop). So the upgrade decision happens at the trade ticket, before purchase. This surfaces the same `gearDelta` there, so "is this worth buying?" is answered before gp is committed — not only after the piece is sitting unequipped in the satchel.

## Design — reuse gearDelta, thread levels as a prop
- TradeTicket already receives `view` (→`worn`) and `selected`, but PlayerView carries no combat levels, so App now passes `lvls={levelsOf(playerAgent.combatXp)}` (new optional prop; omitted in isolated render tests, where the delta still shows and only the "needs Atk N" note is skipped).
- A buy-side block (sibling to the existing blend/break-even previews) calls `gearDelta(selected, view.worn, lvls)` and renders "equips as ⚔+35 Attack vs your Adamant dart"; green `.pct.up` for an upgrade, red `.pct.down` for a downgrade, dim for a sidegrade — same colour semantics as everywhere else. Null for non-gear → nothing shows.

## Outcome
- `App.tsx`: import `levelsOf`; pass `lvls` to TradeTicket.
- `TradeTicket.tsx`: optional `lvls` prop; import `gearDelta`; buy-side gear-delta preview line.
- Tests (+2): TradeTicket renders the "equips as ⚔+35 Attack" preview for a gear buy; renders nothing for a non-gear commodity.

## Gates
- [x] gear buy shows the upgrade delta vs worn; non-gear shows nothing (2 render tests)
- [x] UI suite (245, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- A richer paperdoll GRID (per-item silhouettes in slot layout).
- A gear marker/filter on the MarketTable so gear is findable among the 128 commodities.
- Decide if deep-region death should risk worn gear (currently always safe).
