# Phase: Exchange Wars — Phase 14v: Best-Affordable-Upgrade Advisor (Brick 178)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — progression decision-support / synthesis)
**Goal:** Answer "what should I buy to get stronger?" with a concrete recommendation — the
single biggest gear upgrade you can AFFORD and USE right now, named with its price.
**Done condition:** GearManager shows a "💰 best buy: {item} {⚔/🛡}+N · {price} gp" line
when an affordable, usable, non-owned gear upgrade exists on the market; suite + e2e green.

## Why this brick
The game has rich PER-ITEM upgrade signals (gearDelta badges, the buy-ticket preview) but no
SYNTHESIS — no answer to "across the whole catalog and my purse, what's the best next buy?".
A player chasing power has to eyeball 128 items. The advisor scans the gear catalog and names
the one move. A genuinely new capability (a recommendation), not another readout — returning
to a high-value market/equipment synthesis after a run of varied bricks.

## Design — pure scan helper + one recommendation line
- `bestAffordableUpgrade(worn, lvls, gp, markets, inventory)` (game.ts, pure, reuses gearDelta):
  iterate `GEAR` (sorted ids, deterministic), skip what you already OWN (that's an equip, not a
  buy), require a live `bestAsk ≤ gp` (buyable now within budget), require `gearDelta.usable` and
  `delta > 0` (a real, wearable improvement). Pick max delta, tie-break by lower price then id.
  Returns `{ itemId, price, delta, skill, slot }` or `null`.
- GearManager gains an OPTIONAL `view` prop (markets + gp); when present and the scan finds a
  pick, render a green "💰 best buy" line at the top. ExpeditionPanel passes `view`. Optional so
  existing GearManager render sites/tests are unchanged.

## Why "afford + use + not-owned" (the honest scoping)
- afford = a live `bestAsk` you could pay now (no ask → can't buy → skip; honest about
  buy-it-now, not a theoretical price).
- use = level-met (`gearDelta.usable`) — recommending gear you can't wield is noise.
- not-owned = if you already hold it, the fix is to EQUIP it (the manager's job), not buy another.
- delta>0 = only a real upgrade vs what's worn; sidegrades/downgrades never recommended.

## Scope (in)
- `game.ts`: `bestAffordableUpgrade` + `UpgradePick`
- `GearManager.tsx`: optional `view` prop + the recommendation line
- `ExpeditionPanel.tsx`: pass `view` to GearManager
- `app.test.tsx`: helper unit (pick / afford-fallback / owned-skip / level-gate / null) + a render assertion

## Scope (out)
- No click-to-buy navigation (names the buy; the player goes to the Exchange) — a follow-up
- No engine change; no consideration of off-stat (defence on a weapon) in the headline delta

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/GearManager.tsx
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] helper: biggest affordable/usable/non-owned upgrade; afford-fallback; owned & no-ask skip; under-level & empty → null
- [x] GearManager renders the "best buy" line when a pick exists; omitted without `view`
- [x] UI suite (312, +5) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Headline uses the governing-stat delta only; a combined atk+def score could rank two-stat
  pieces better — deferred (governing stat is what gates the slot).
