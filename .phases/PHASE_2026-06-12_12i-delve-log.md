# Phase: Exchange Wars — Phase 12i: Persistent Delve Log (Brick 113)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (RPG — give the adventure loop the persistent history the trade side already has)
**Goal:** Latch each finished expedition (region, kills, loot, survived/died) into Game state when it ends — surviving the dive the engine's expedition state can't — and surface a Delve Log panel. UI-only, live on main.
**Done condition:** completed expeditions recorded (death + extract) and shown newest-first with outcome + loot; pure helpers tested; capture extends the proven death-detection effect; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
Breadth pivot off trading into the adventure loop. Trading has a persistent fill/trade history; the adventure side had only aggregate stats (total slain/deaths in RecordsPanel) and transient toasts — no per-expedition record. The engine's `exp` state is gone the instant you extract or die, so any history must be latched UI-side at the end-transition.

## Key reuse + classification
The death-detection effect (ExpeditionPanel) already snapshots `exp` each render and fires on the present→absent transition. Extended it: on ANY end (not just death) record a `DelveRecord`. Outcome is classified by the existing `prev.inCombat` signal — you can only extract OUT of combat, so vanishing mid-combat = death, vanishing otherwise = a clean extract. No new detection machinery, just one more branch on a proven transition. Capture routes through a new `onDelveEnd` callback so App owns the Game-state mutation + persistence (mirrors how the death toast routes through `onToast`).

## Outcome
- `game.ts`: `DelveRecord {tick, regionId, kills, lootGp, died}`; `Game.delves?` (optional — no test-literal churn, per the 11s lesson); `summarizeDelve(snapshot, died, tick)` + `recentDelves(delves, n)` (newest-first, capped) pure; `DELVE_LOG_CAP=30`; normalizeGame defaults `delves: []`.
- `ExpeditionPanel.tsx`: snapshot now also carries `cleared`; the end-transition fires `onDelveEnd(summarizeDelve(...))` for death AND extract; the death toast still only fires on death.
- `App.tsx`: `onDelveEnd` appends to `game.delves` (capped via splice), saves, forces a re-render; `DelvePanel` mounted in the Hall.
- `DelvePanel.tsx`: newest-first list — `🏆/☠ region · N kills · ±loot · Nm ago`, +loot (banked) green / −loot (lost) red; empty state.
- Tests (+4): `summarizeDelve` (survived/died mapping) + `recentDelves` (order, cap, undefined) + DelvePanel empty + populated (outcome icons + count). 318/318 unit, 9/9 e2e. FINDINGS #147.

## Gates
- [x] `summarizeDelve` / `recentDelves` pure
- [x] DelvePanel renders outcomes + empty state
- [x] Expedition flow intact (e2e), capture exercised by the embark e2e
- [x] Typecheck + 318 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- Click a Delve Log row to re-select that region in the Adventure tab.
- A session/lifetime "delve success rate" stat off the log.
