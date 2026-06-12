# Phase: Exchange Wars — Phase 13l: Flip Affordability Lens (Brick 142)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — trading; make Best Flips capital-aware)
**Goal:** Each flip shows how many units your gp can actually open, with a filter to the affordable ones.
**Done condition:** a `flipAffordability` pure helper + per-row ×N badge (dim/✕ when unaffordable) + a "fits purse" filter in TopFlips; UI suite + e2e green. **MET.**

## Why this brick
TopFlips ranks by absolute margin and ignores your gp — but when capital is tight (early run) the best-margin flip is often unaffordable, and a flip you can fully open matters more than one you can't touch. This adds the capital lens.

## Design — an AFFORDABILITY cap, not a realizable-profit claim
Honest scoping (respecting the earlier decision to decline realizable-profit *ranking* — depth at the price is order-flow the UI can't see):
- `flipAffordability(buy, gp, limit)` (TopFlips.tsx, pure, co-located with `rankFlips`): units = `min(floor(gp/buy), limit ?? ∞)`. Returns `{units, affordable, limited}` (`limited` = the GE limit, not gp, is the bind). It says how many you can OPEN now (gp-bound + limit-bound), NOT how many will fill.
- Per-row `×N` badge; unaffordable rows get `✕` + 0.5 opacity (recede, stay readable).
- A "fits purse" toggle: ranks deeper (limit 100) then filters to affordable + slices — so a flip your purse can cover surfaces even if it's outside the top-few by margin. Ranking stays margin-ordered within the affordable set (no order-flow guess).
- Defensive `view.gp ?? 0` so a partial-view render never NaNs.

## Outcome
- `TopFlips.tsx`: `flipAffordability` + `FlipAfford`; `fitOnly` toggle; per-row badge + dim; empty-state copy for the filtered case.
- `styles.css`: `.flipafford` / `.flipafford.short` / `.mover.flip.unafford`.
- Tests (+5): `flipAffordability` (gp-bound, limit-capped, unaffordable, null-limit) + a TopFlips render (✕ on the rich flip, ×N on the cheap one, "fits purse" drops the unaffordable).

## Gates
- [x] flipAffordability correct across gp-bound / limit-capped / unaffordable / unlimited (4 unit tests)
- [x] badge + filter render and behave (render test)
- [x] UI suite (256, +5) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- Remaining Explore trading gaps: highlight underwater positions in PositionsPanel; a per-flip round-trip trade journal.
- The ×N badge could also appear on the ticket once an item is loaded.
