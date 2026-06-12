# Phase: Exchange Wars — Phase 14c: Bestiary Combat Stats (Brick 159)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — turn the Bestiary into a planning reference)
**Goal:** Show each met monster's atk/def/hp (and leech) in the Bestiary.
**Done condition:** met-monster Bestiary rows show "⚔X 🛡Y · Z hp [· 💧N/rd]"; suite + e2e green. **MET.**

## Why this brick
The Bestiary listed met monsters' names, gp range, drops, and kill count — but NOT their combat stats, so it couldn't answer "can I handle the Abyss demon?" pre-dive. 13z/14a/14b surface a foe's stats/leech IN combat and AT embark; the Bestiary is the natural third surface — a persistent reference to plan dives by, now showing the same threat data for everything you've slain.

## Design — add the stats to the existing met-monster row
- The met-monster row gains "⚔{atk} 🛡{def} · {hp} hp" (plus "· 💧{leech}/rd" for leech foes) before the gp/drops — turning the Bestiary from a kill-log into a stat reference. Plain (no danger colour): it's a neutral reference, distinct from the contextual in-combat danger read.

## Outcome
- `ExpeditionPanel.tsx`: combat stats + leech on each met Bestiary entry.
- Tests (+1): a met goblin shows "⚔4 🛡1 · 12 hp" in the bestiary.

## Gates
- [x] met-monster rows show atk/def/hp (+ leech) (render test)
- [x] UI suite (282, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- None — threat data is now consistent across combat (13z/14a), embark (14b), and the Bestiary reference (14c).
