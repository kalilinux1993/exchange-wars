# Phase: Exchange Wars — Phase 17w: Show the foe's drops in combat (Brick 257)

**Started:** 2026-06-12
**Hat:** Builder (adventure — the reward half of the fight/flee call)
**Goal:** During a fight, show what the CURRENT foe can drop (likeliest first) under the survival forecast —
so "fight or flee?" weighs the loot upside, not just the survival odds.
**Done condition:** The combat readout shows a "drops {item} {chance}% · …" line for a foe with drops (none
for a drop-less foe); suite + e2e green.

## Why this brick
The combat readout has the danger (foe ⚔/🛡, 🔥/💧) + the live survival forecast (≈hits to finish / to fall /
winning-the-race), but NOT what the kill is worth — you'd have to remember the Bestiary. Adding the specific
foe's drop list inline completes the fight/flee decision (risk ⟷ reward), in context, for the foe you're
actually facing. Pivoting to adventure (last feature was 17g, ~14 bricks back) for breadth.

## Design — reuse the foe's drop table, render under the forecast
- `ExpeditionPanel.tsx`: `m = monsterById(exp.combat.monsterId)` already drives the readout; add a
  `.foedrops` line after the forecast — `m.drops` sorted by chance desc, top 3 as "{name} {chance}%" (item
  names via an `itemNames` map off `game.world.items`), "+N more" beyond 3, gated to `m.drops.length > 0`.
  Same drop data the Bestiary (per-monster) and the embark loot read (region aggregate) use, here for the
  SPECIFIC foe in front of you.

## Scope (in)
- `ExpeditionPanel.tsx`: `itemNames` map + the in-combat `.foedrops` line
- `app.test.tsx`: an active goblin fight shows "adamant dart 15%"

## Scope (out)
- No icons (text, matching the dim-small combat readout + the Bestiary's text drops); no engine change → no redeploy
- Drop-less foes (giant_rat) show no line

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] in-combat `.foedrops` shows the foe's drops (likeliest first, top 3 + "+N more"); none for a drop-less foe
- [x] UI suite (421, +1) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the foe drop table already shown elsewhere; pure display.
