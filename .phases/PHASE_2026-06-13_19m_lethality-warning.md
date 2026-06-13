# Phase: Exchange Wars — Phase 19m: "a hit could down you" lethality warning in combat (Brick 299)

**Started:** 2026-06-13
**Hat:** Builder (in-fight survivability — the highest-stakes decision, grounded in the now-accurate damage math)
**Goal:** The combat view shows hp, foe stats, eat buttons, and a rounds-either-way forecast — but never the
one thing that decides eat-vs-fight: can the foe's NEXT hit kill me? The engine's worst-case single landed hit
is `max(1, max(2, atk) − floor(def/4))` (quest.ts:413-415, the top of the damage roll) plus dragonfire's
`ceil(atk/2)` when no antifire (quest.ts:481). When that worst case ≥ your current hp, the next round COULD be
lethal. Surface a "⚠ a hit could down you — eat or flee" warning exactly then.
**Done condition met:** yes — a pure `maxHit(atk, def)` mirrors the engine's damage upper bound; the combat
view computes the foe's worst-case hit (+ dragonfire) and shows the lethality warning when `playerHp ≤` it;
tests pin `maxHit` + the render; suite + e2e green; typecheck clean.

## Why this brick
The forecast (roundsToFall) reads the TYPICAL race; it doesn't answer "could I die THIS round?" — a worst-case
question the player needs before committing to another swing. The death mechanic burns the haul, so a
mis-timed fight is the costliest mistake in the game. The eat buttons already exist; this tells the player WHEN
they're load-bearing. It's the in-fight tier of the survivability ladder (embark 19f → push 19g → here),
grounded in the same damage formula 19e corrected — worst-case (max hit lands), the honest "it's POSSIBLE to
die" trigger, not a probability.

## Design — maxHit helper + a gated warning in the combat view
- `game.ts` `maxHit(atk, def)`: `Math.max(1, Math.max(2, atk) − Math.floor(def / 4))` — the top of the engine's
  damage roll after armour, floored at 1. Pure. Dragonfire's flat `ceil(atk/2)` is added by the caller OUTSIDE
  this (it sits outside the per-roll floor, quest.ts:481), reusing the `dragonBonus` already computed there.
- `ExpeditionPanel.tsx` (combat view, the forecast IIFE at ~373): `foeMax = maxHit(m.atk, youDef) +
  dragonBonus`; when `exp.combat.playerHp ≤ foeMax`, render "⚠ a hit could down you (≤{foeMax} vs {hp} hp) —
  eat or flee" (the eat buttons + flee are right there). Reuses `m`, `youDef`, `dragonBonus`, `exp.combat`.

## Scope (in)
- `packages/ui/src/game.ts`: `maxHit` helper
- `packages/ui/src/components/ExpeditionPanel.tsx`: the lethality warning in the combat view
- `packages/ui/test/app.test.tsx`: pin `maxHit` (roll top − floor(def/4), floor at 1) + a combat render test (low hp vs a hard foe → warning shows; healthy → absent)

## Scope (out)
- No probability tier ("you'll LIKELY die" from expectedHit) — one clear worst-case "could" warning is higher
  signal; the forecast already shows the typical race; no auto-eat change (the autopilot already eats < 40%);
  no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] maxHit: max(1, max(2,atk) − floor(def/4)) — pinned (incl. the floor-at-1 under heavy armour)
- [ ] combat view shows "a hit could down you" when playerHp ≤ foe worst-case hit (+dragonfire); absent when safe
- [ ] UI suite (+~2) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — maxHit mirrors the verified damage formula (19e); dragonfire handling matches the forecast's dragonBonus.
