# Phase: Exchange Wars — Phase 18e: In-dive death-stakes readout (what losing costs) (Brick 265)

**Started:** 2026-06-13
**Hat:** Builder (adventure — make the push-vs-bank consequence concrete)
**Goal:** During a dive (between fights, loot at stake), show the precise cost of dying — death keeps your 3
most valuable carried items (`deathRecap`) and burns the rest + ALL gathered loot gp. The panel already
shows the survival ODDS (the push-read); this adds what LOSING costs, so risk = odds × consequence is fully
on screen at the game's central decision.
**Done condition:** an in-dive non-combat panel with loot at stake shows "⚰ if you fall here: lose {gp} loot
gp [+ N items] · keep {3 best}"; gated to packGp>0; suite + e2e green.

## Why this brick
The push-vs-bank call is the game's core tension, and the in-dive panel instruments the ODDS richly
(push-read: rounds-to-kill/fall, favored/risky, food cushion, "bank your haul?") — but never the
CONSEQUENCE. The extract button's tooltip says death "loses the whole haul," and the help mentions the
keep-3 rule, but the actual stake (how much loot gp you'd lose, how many items, what survives) is never a
visible readout at the moment you decide. `deathRecap` already computes it exactly (keep the 3 most valuable
units by baseCost, lose the rest + packGp) — it's used for the death TOAST; surfacing the same recap
BEFORE death turns "risky?" into "risky, and here's what it costs." Reassuring where it should be (your gear
survives) and sobering where it should be (the loot is 100% gone).

## Design — render the existing deathRecap in-dive
- `ExpeditionPanel.tsx` (non-combat in-dive branch, right under the push-read, above the controls): when
  `exp.packGp > 0`, compute `deathRecap(game.world.items, exp.pack, exp.packGp)` and render a `.deathstakes`
  line: "⚰ if you fall here: lose {lostGp} loot gp [+ {lostUnits} item(s)] · keep {kept.join(', ')}".
  Loss in red, kept in green. No new helper — `deathRecap` is already imported + tested.
- Gated to packGp>0 (something to lose) so an empty-handed early dive stays uncluttered — matching the
  push-read's own "bank your haul?" gate.

## Scope (in)
- `packages/ui/src/components/ExpeditionPanel.tsx`: the `.deathstakes` line in the in-dive non-combat branch
- `packages/ui/test/app.test.tsx`: a render test (in-dive, packGp>0, pack with >3 units → shows lose gp + keep names)

## Scope (out)
- No embark-time variant (at embark packGp=0, so the stake is just food — not compelling); no engine change → no redeploy
- No change to the death TOAST or the extract wording (the toast already uses deathRecap; this is the pre-death preview)

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] in-dive (non-combat, packGp>0) shows "⚰ if you fall here: lose 5,000 loot gp + 2 items · keep Shark…" — render test
- [x] gated off when packGp=0 (render test: `.deathstakes` null); reuses the tested `deathRecap` (no new logic)
- [x] UI suite (433, +2) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — renders an already-tested helper at a new (pre-death) moment; the only choice is the packGp>0 gate.
