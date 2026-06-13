# Phase: Exchange Wars — Phase 19g: live "kills before you'd fall" survivability read mid-dive (push-vs-extract) (Brick 293)

**Started:** 2026-06-13
**Hat:** Builder (carry the 19f survivability synthesis to the moment it matters most — the live push-vs-extract call)
**Goal:** 19f added "≈N kills before you'd fall" to the EMBARK forecast (full HP, pre-dive). But the real,
repeated risk decision is mid-dive: at CURRENT hp, with wounds carried between fights, do I push the next foe
or bank my haul? The live push-read (ExpeditionPanel:471-518) already computes the current-hp forecast `f` and
the packed-food cushion `packHeal`/`ff`, but only surfaces raw rounds + "food +≈N rounds". Apply the same
`survivableKills` synthesis there so the push-vs-extract call gets the digestible count, at current hp, scaled
by remaining food.
**Done condition met:** yes — a second forecast line in the live dive reads "≈N more kills before you'd fall ·
≈M with food" using `survivableKills(f, exp.hp, packHeal)`; renders between the push-read (odds) and the
death-stakes (consequence); a render test pins it for a survivable food-stocked dive; suite + e2e green;
typecheck clean.

## Why this brick
The push-vs-extract decision is the core risk loop of a dive, and it recurs every encounter. The embark
survivability read (19f) only fires once, before you start; mid-dive your hp is lower and your food is being
spent, so the count CHANGES as the dive progresses — exactly when a live number beats raw rounds. It also
closes the symmetry: embark and dive now speak the same survivability language. No new combat math — reuses the
current-hp forecast `f` and `packHeal` already in scope, plus the 19f `survivableKills` helper.

## Design — one more line in the existing push-read IIFE
- `ExpeditionPanel.tsx`: wrap the push-read `<p>` and a new `<p className="dim small survival">` in a fragment
  (keeps `f`/`packHeal`/`exp.hp` in scope). `kills = survivableKills(f, exp.hp)`, `fed = survivableKills(f,
  exp.hp, packHeal)`; render "≈{kills} more kill(s) before you'd fall" (cap "20+"), append " · ≈{fed} with
  food" when `fed > kills`. Uses the HARDEST-foe forecast `f` (consistent with the push-read verdict above it).
- `survivableKills` already exists (19f) — import it into ExpeditionPanel.

## Scope (in)
- `packages/ui/src/components/ExpeditionPanel.tsx`: import survivableKills + the live survivability line
- `packages/ui/test/app.test.tsx`: a render test (lumbridge full-hp + shark×4 → positive count + food clause)

## Scope (out)
- No new helper (reuses 19f `survivableKills`); no change to the push-read verdict line or its food-rounds cue;
  no engine change → no redeploy; no typical-foe variant of the count (keep it on the hardest, like the verdict)

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] live dive renders "≈N more kills before you'd fall · ≈M with food" at current hp; sits between push-read + death-stakes
- [ ] existing push-read tests (query p.forecast) unaffected — new line is a separate <p>
- [ ] UI suite (+1) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — survivableKills math is pinned by 19f's unit tests; this brick is the render wiring at current hp.
