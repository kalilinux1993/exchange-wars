# Phase: Exchange Wars — Phase 8v: The Bestiary (Brick 22)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (recognition brick — collection codex + stat deeds)
**Goal:** Per-monster kill tracking (stats.killsByMonster, one line in the win branch) feeding a Bestiary codex in the Expeditions panel: unmet monsters render as ???, met ones show kill counts, gp ranges, full drop tables, ★ for elites, 🔥 for dragonfire. Plus the three missing stat deeds: Swordhand / Bulwark / Iron Constitution (level 10 in Attack / Defence / Hitpoints, with progress bars).
**Done condition:** tally + codex + deeds shipped with tests; suite green; fn redeployed (state-shape lockstep). **MET.**

## Outcome
- Engine: killsByMonster tally (absent = none, old saves fine); the bestiary count provably equals monstersSlain kill-for-kill (tested).
- UI: native <details> disclosure, zero component state; MONSTERS array is the render source so future monsters appear automatically.
- Deeds: levelsOf was already exported, milestones already took progress fns — pure data additions.
- 174/174; no economy surface touched (audit table stands); fn redeployed (76.6kb). FINDINGS #56.

## Gates
- [x] Tally agrees with monstersSlain (engine test)
- [x] Discovery reveal: ??? until met (UI test)
- [x] Suite green; fn redeployed
