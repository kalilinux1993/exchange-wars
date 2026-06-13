# Phase: Exchange Wars — Phase 19f: "kills before you'd fall" survivability read on the embark forecast (Brick 292)

**Started:** 2026-06-13
**Hat:** Builder (decision-instrument the embark forecast — quantify dive survivability, now that the combat math is trustworthy post-19e)
**Goal:** The embark forecast shows raw `roundsToKill`/`roundsToFall`, and `embarkPrep` gives only a BINARY
"no food packed" warning — it never says whether the food you DID pack is enough. Now that `combatForecast`
is engine-accurate (19e), synthesize the two round counts into the number players actually want: **how many
foes you can down in one sustained dive before you'd fall** (≈ roundsToFall / roundsToKill, since HP carries
between foes — the engine doesn't regen mid-dive), and how packed food extends it. Packing 1 shark for a
10-kill Abyss run passes the binary check but is wildly short; a number catches that.
**Done condition met:** yes — a new pure `survivableKills(forecast, hp, packHeal)` returns kills-before-fall
(food scales the HP pool); the EmbarkPanel forecast renders "≈N kills before you'd fall" with a packed-food
extension (and a "pack food to go deeper" nudge when thin); tests pin the math + edges; suite + e2e green;
typecheck clean.

## Why this brick
The death mechanic BURNS your loot + all but your top-N units (commands.ts:159), so under-provisioning a dive
is expensive — yet the only survivability signal today is `favored`/`risky` (a single-fight verdict) plus a
binary food warning. Neither answers "can I clear this region's pack without dying, and is my food enough?"
`roundsToFall / roundsToKill` is the honest synthesis: you kill one foe every `roundsToKill` rounds and fall
after `roundsToFall` rounds of incoming damage, with HP carrying over (no mid-dive regen), so the ratio IS the
sustainable kill count. Food adds a flat HP cushion → scales the ratio. This turns two abstract round counts
into one actionable number and makes "how much food?" quantitative.

## Design — a pure helper + one forecast line
- `game.ts` `survivableKills(forecast: {roundsToKill, roundsToFall}, hp, packHeal = 0)`: `hp<=0 ||
  roundsToKill<=0 → 0`; else `floor((roundsToFall / roundsToKill) · (hp + max(0,packHeal)) / hp)`. Pure. An
  estimate (labeled), consistent with `combatForecast` (favored ⟺ ratio ≥ 1 ⟺ ≥1 kill).
- `EmbarkPanel.tsx`: after the forecast `<p>`, compute `base = survivableKills(f, trainedMax)` and `withFood =
  survivableKills(f, trainedMax, healFromPack(draft))`. Render "≈{base} kills before you'd fall" (cap display
  at "20+"); append " · ≈{withFood} with packed food" when food raises it, else " · 🍖 pack food to go deeper"
  when base is thin (<5). Reuses the `f` and `draft` already in scope.

## Scope (in)
- `packages/ui/src/game.ts`: `survivableKills` helper
- `packages/ui/src/components/EmbarkPanel.tsx`: the survivability line (+ import healFromPack/survivableKills)
- `packages/ui/test/app.test.tsx`: pin survivableKills math (favored→≥1, risky→0, food extends) + edges (hp 0, div guards)

## Scope (out)
- No change to `combatForecast`/`expectedHit` (verified accurate 19e — don't disturb); no per-foe inventory/GE-slot
  dive-length modeling (combat is the limit this reads); no engine change → no redeploy
- No mid-dive regen modeling (the engine doesn't regen mid-dive; food is the only in-dive heal)

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] survivableKills: favored→≥1, risky→0, packed food strictly raises it, hp/roundsToKill guards → 0 — pinned
- [ ] EmbarkPanel renders the survivability line; food extension + thin nudge correct
- [ ] UI suite (+~2) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Display cap ("20+") is cosmetic; the helper returns the raw integer so tests pin exact math.
