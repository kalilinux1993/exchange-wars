# Phase: Exchange Wars — Phase 13s: Upgrade Affordability Hints (Brick 149)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — progression/shop; the "what to save for" decision)
**Goal:** The shop shows your spendable purse and how far short you are of each upgrade.
**Done condition:** UpgradeShop header shows gp; each unaffordable upgrade shows "need +X"; UI suite + e2e green. **MET.**

## Why this brick
Rotated to the UpgradeShop (untouched). It listed prices and greyed out unaffordable buttons — but gave no sense of how CLOSE you are, so a saving goal was invisible. The "what should I buy / save for next?" decision had no support, the same affordability gap 13l closed for flips.

## Design — one hint helper, applied to all four buttons + a header purse
- A local `need(cost)` helper renders an amber "need +{shortfall}" span when `cost` is finite and `view.gp < cost`; null otherwise. Applied uniformly after the slot / auto-flipper / sellsword / death-ward buttons — one rule, four buttons, no divergence.
- The header gains the spendable purse (`view.gp gp`) — the RIGHT number for purchases (upgrades cost cash, not held goods), so it's not a WealthPanel duplicate (that shows net worth).

## Outcome
- `UpgradeShop.tsx`: `need()` helper; header purse; `{need(cost)}` after all four upgrade buttons.
- `styles.css`: `.shortfall`.
- Tests (+1): a 100-gp purse renders "100 gp" in the header and "need +4,900" against the 5,000-gp slot.

## Gates
- [x] purse in header; shortfall hint on an unaffordable upgrade (render test)
- [x] UI suite (265, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- An ETA to afford the next upgrade from the recent gp/min rate (pairs with the Fortune chart's projection).
