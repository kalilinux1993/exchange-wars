# Phase: Exchange Wars — Phase 12y: Sellsword Dive Visibility (Brick 129)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG/UX — give the sellsword its own visibility, the render-side complement to 12x)
**Goal:** Flag a sellsword-owned dive in the expedition view (so the player doesn't mistake it for their own or fight its rounds by accident) and show the sellsword's lifetime haul at its toggle. UI-only, live on main.
**Done condition:** a clear "your sellsword is on this dive" banner when the hunt is on + the slot occupied; the toggle shows kills/banked; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
12x stopped the sellsword's dives from polluting the PLAYER's Delve Log + toasts. The render-side complement: the sellsword shares `agent.expedition`, so while it hunts mid-dive the player sees the full INTERACTIVE dive view (fight/extract buttons) for the sellsword's dive — confusing, and the buttons would interfere with the automation. A banner makes ownership unmistakable.

## Outcome
- `ExpeditionPanel.tsx`: when `agent.sellsword` is on during an active dive, a "🗡 your sellsword is on this dive — it fights on its own" banner at the top of the dive view (same `bySellsword` heuristic as 12x — practical, since manual dives run with the hunt off). The sellsword toggle line now also shows its lifetime haul inline ("N kills · X gp banked"), visibility where you control it (it was only in the Hall's Almanac/Records before).
- Tests (+2): the 12x `startDive` helper reused — a sellsword-owned dive shows the banner; a player-owned dive does not. 354/354 unit, 9/9 e2e. FINDINGS #163.

## Gates
- [x] Banner on a sellsword-owned dive, absent on the player's (render tests)
- [x] Typecheck + 354 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- The interactive fight/extract buttons still render during a sellsword dive (banner only clarifies; doesn't disable). A full read-only sellsword-dive view would prevent interference outright — but cleanly distinguishing ownership really wants an engine `bySellsword` flag on the expedition (a Jesse-present engine change), so the heuristic banner is the right UI-only stopping point for now.
