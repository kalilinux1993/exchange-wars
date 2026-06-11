# Phase: Exchange Wars — Phase 8d: Expedition Deeds & Onboarding (Brick 4)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc — progression hooks)
**Goal:** Expeditions earn Deeds: Monster Slayer (first kill), Veteran of the Depths (25 kills, progress), Frontier Pioneer (reach the Wilderness), Dragon Slayer (capstone — detected by minted superior dragon bones). World stats gain monstersSlain/deepestRegion. Extract toasts the homecoming haul. Guide + README teach the dungeon.
**Done condition:** stats wired in the engine (tested), 4 deeds latch (tested), extract toast, guide/README updated, gates green, CI + live.

## Scope (in)
- SimStats: monstersSlain, deepestRegion (init + increments in commands.ts)
- MILESTONES +4 (now 20); extract homecoming toast in ExpeditionPanel
- HelpOverlay expedition bullet; README feature line
- Tests: stats increments (engine), deed latches (UI)

## Scope (out)
- Deepest-dive verified boards (8e); more monsters/regions/events (future ideas iterations)

## Gates
- [ ] typecheck + unit + e2e green
- [ ] CI green + live bundle verified
