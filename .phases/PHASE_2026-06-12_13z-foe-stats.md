# Phase: Exchange Wars — Phase 13z: Know-Your-Enemy Combat Stats (Brick 156)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG; the in-combat view, the most game-y surface)
**Goal:** Show the current foe's atk/def (danger-coloured) during a fight, matching the embark danger read.
**Done condition:** the combat view shows the foe's ⚔/🛡 stats red/green vs yours (+ a fire mark); suite + e2e green. **MET.**

## Why this brick
The in-combat view showed the foe's HP and a live rounds-forecast, but never the foe's atk/def — so the forecast's verdict had no visible "why", and the combat view was INCONSISTENT with the embark screen, which colours the region's foe stats red/green vs yours. "Know your enemy" was missing exactly where you fight.

## Design — reuse the embark danger-colour lens, hoist your effective stats
- Hoisted `youAtk`/`youDef` (gear + dive brew) above the foe readout (they already fed the forecast, now feed both — no duplicate computation).
- The foe line gains `⚔{atk} 🛡{def}`: atk red (`down`) when it beats your defence, def red when it out-defends your attack — the SAME lens as `regionDanger` at embark (visual consistency, #164 lineage). A 🔥 (or 🛡🔥 when antifire holds) marks a dragonfire foe.

## Outcome
- `ExpeditionPanel.tsx`: hoisted `youAtk`/`youDef`; foe-stats span on the combat readout line.
- Tests (+1): in a goblin fight, the foe's atk (4, beats your def 2) renders `.down` and its def (1, under your atk 5) renders `.up`.

## Gates
- [x] foe atk/def shown with correct danger colour vs your effective stats (render test)
- [x] UI suite (279, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- The same foe-stat line could note leech (drains loot, not hp) so the player knows the fight's a gp-race not an hp-race.
