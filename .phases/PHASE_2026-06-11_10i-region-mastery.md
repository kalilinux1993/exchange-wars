# Phase: Exchange Wars — Phase 10i: Region Mastery (Brick 61)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (progression — reward breadth over farming)
**Goal:** A one-time combat-xp bounty on the FIRST clear of each region (BASE 40 + 30×depth), hooked to the existing frontier-advance (questProgress only moves once per region). XP not gp → economy untouched.
**Done condition:** mastery granted + journal on first clear; tests; fn redeployed (replay-affecting). **MET.**

## Outcome
- commands.ts: MASTERY_BASE/PER_REGION; in the win-branch frontier-advance, grant masteryXp to atk/def (+hp ceil/3) once per region + journal line.
- No new tracking state (questProgress is the once-per-region marker). Last region (Abyss) grants none — logged caveat.
- 201/201 unit (plains clear → 'mastered' journal + combatXp includes the bonus); 9/9 e2e; verify-score rebuilt (86.8kb) + redeployed. Balance untouched (xp, not gp). FINDINGS #95.

## Gates
- [x] First-clear grants mastery xp + journal (test)
- [x] Suite + e2e; fn redeploy (replay-affecting)
