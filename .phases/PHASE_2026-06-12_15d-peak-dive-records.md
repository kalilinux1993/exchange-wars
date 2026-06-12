# Phase: Exchange Wars — Phase 15d: Peak-Dive Records (Brick 186)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — progression records)
**Goal:** Mark a player's PEAK raids in the Adventurer's Record — their biggest single banked
haul and the most they've ever cleared in one dive.
**Done condition:** RecordsPanel shows "Best single haul" (max banked lootGp + region) and
"Most cleared in a dive" (max kills + region) when the Delve Log has any qualifying dive; suite
+ e2e green.

## Why this brick
The Record panel has lifetime AGGREGATES (monsters slain, deaths, contracts) but no PEAKS — no
"your best ever" the way the trading side has the daily-best (10z) and net-worth peak. Peaks are
a satisfying progression marker. Verified novel: no `bestHaul`/`bestDive`/peak-dive record exists
anywhere. UI-only — derived from the existing `DelveRecord` (lootGp / kills / died).

## Design — pure peak helper + two appended rows
- `diveRecords(delves)` (game.ts, pure) → `{ bestHaul: {regionId, lootGp} | null, mostKills:
  {regionId, kills} | null }`. `bestHaul` counts only SURVIVED dives (a death forfeits the loot, so
  it's not a haul); `mostKills` counts any dive (you cleared them even if you fell after).
- RecordsPanel: append "Best single haul" + "Most cleared in a dive" rows (with the region named)
  when each is non-null — derived from `game.delves`, beside the stats-derived rows. `recordRows(st)`
  stays stats-only (its signature unchanged); the delve-derived rows are added in the component.

## Scope (in)
- `game.ts`: `diveRecords` + `DiveRecords`
- `RecordsPanel.tsx`: the two peak rows (region-named, compacted gp)
- `app.test.tsx`: helper unit (max banked / ignores deaths for haul / most kills / nulls) + a render

## Scope (out)
- No "new best!" celebration toast (a future follow-up — would need an identity-keyed baseline like
  14e/14f); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/RecordsPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `diveRecords`: bestHaul = max lootGp among SURVIVED dives (a 9000-loot DEATH is excluded); mostKills = max kills any dive; nulls when none
- [x] RecordsPanel shows both peak rows (region-named) when present; absent on a fresh game
- [x] UI suite (327, +3) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Note
- Test learning: `fmtCompact(1500)` isn't compacted ("1.5K"), so the render test asserts the haul
  row names its REGION rather than a specific compacted string — robust to the compaction threshold.

## Open questions
- None — pure peak over the Delve Log.
