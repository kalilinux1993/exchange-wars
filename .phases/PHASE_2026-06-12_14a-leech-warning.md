# Phase: Exchange Wars — Phase 14a: Leech Gp-Race Warning (Brick 157)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — combat; surface a hidden strategic mechanic)
**Goal:** Warn in combat when a foe drains loot gp per round (the Abyss leech).
**Done condition:** the combat foe line shows "💧−N gp/round" for a leech foe; suite + e2e green. **MET.**

## Why this brick
The Abyss foes (`abyssal_leech` 40, `abyssal_demon` 80, `vessith` 200) bleed that much loot gp from your pack EVERY round the fight drags (quest.ts:79-81, 117/118/127) — making it a gp-race, not just an hp-race: drag it out and you lose coin even while winning. The engine has done this all along, but the UI never told the player (only a code comment noted it). A foe whose hidden cost is invisible is one the player mis-plays.

## Design — one conditional marker beside the 13z foe stats
- When `m.leech` is set, the foe line shows "💧−{leech} gp/round" in red beside the 13z atk/def readout, titled to explain it's a gp-race (finish fast or extract before it eats your haul). Completes the foe readout: hp + atk/def (13z) + the gp-drain threat (14a).

## Outcome
- `ExpeditionPanel.tsx`: a `m.leech` warning span on the combat foe line.
- Tests (+1): a fight vs `abyssal_leech` shows "40 gp/round".

## Gates
- [x] leech warning shows the per-round drain for a leech foe (render test)
- [x] UI suite (280, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- The same warning could appear in the region danger read (the Abyss is the only leech region) so it's known before embarking.
