# Phase: Exchange Wars — Phase 8e: Choices in the Dark (Expeditions Brick 5)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc — "make choices and journey")
**Goal:** advance draws more than monsters: loot caches (mint gp), traps (lose hp — can kill, same keep-3 death), and CHOICE events resolved by a new `choose {accept}` command — the Shrine (pay 25% of loot gp, min 50, heal to full) and the Goblin Dice (stake 100 loot gp, 50/50 double or nothing). All on the expedition's private RNG.
**Done condition:** encounter mix rolls deterministically; instant events conserve (mint/burn); both choices' branches tested; death-by-trap reuses keep-3 (refactored helper); panel renders event prompts with accept/decline chips; existing fight-loop tests/e2e made event-tolerant; gates green; CI + live.

## Scope (in)
- quest.ts: EventState kinds + ENCOUNTER odds; commands.ts: advance roll, `choose`, death helper refactor
- ExpeditionPanel event UI; tests (engine + UI + e2e robustness)

## Scope (out)
- Deepest-dive boards (replay-budget design needed); merchant events; multi-step events

## Gates
- [ ] typecheck + unit + e2e green (invariants after every command, both choice branches)
- [ ] CI green + live bundle verified
