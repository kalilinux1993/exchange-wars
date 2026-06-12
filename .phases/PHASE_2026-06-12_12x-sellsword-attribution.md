# Phase: Exchange Wars — Phase 12x: Sellsword Expedition Mis-Attribution Fix (Brick 128)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Reviewer → Builder (fix the HIGH bug a component-effects adversarial review surfaced)
**Goal:** Stop the death-detection / Delve Log effect from firing for the SELLSWORD's auto-expeditions (which share the player's expedition slot). UI-only, live on main.
**Done condition:** sellsword dives no longer log to the Delve Log or fire a "You died" toast; player dives still do; review's MEDIUM (stale celebration refs on restart) also fixed; suite + e2e green; no engine change → no redeploy. **MET.**

## The bug (found by adversarial review of this session's effects)
A component-effects review (the 12u review only covered pure helpers) returned SIGNIFICANT-CONCERNS. Verified against the engine: `actSellsword` (commands.ts:406) calls `beginExpedition`, which sets `agent.expedition` — the SAME slot the player's manual dives use — and it runs inside `tickWorld` (sim.ts:166). So with a sellsword hired + hunting, its auto-dives flow through the death-detection effect (ExpeditionPanel), which my 12i brick had extended to also write the Delve Log. Result: spurious Delve Log entries for sellsword dives, and a **false "You died in X" toast attributed to the player** when the sellsword died (the toast half pre-dated 12i; 12i added the log half). Reference-verified before fixing (Kronos rule).

## Fix
`agent.sellsword` is the hunt-active flag. Stamp `bySellsword: !!agent.sellsword` into the death-detection snapshot AS THE DIVE IS OBSERVED (robust against the toggle changing at the boundary), and gate the `onDelveEnd` + death toast on `!prev.snapshot.bySellsword`. Sellsword dives report through their own channels (`sellswordKills`/`sellswordBanked` stats + the away-bar summary), so suppressing the player-facing narration is correct, not a loss. UI-only — reads `agent.sellsword`, no engine change.

Also fixed the review's MEDIUM: `incomingBest` / `recordCelebrated` (12w) are now reset in `restart()`, so the daily-record celebration can't fire against a stale prior-seed best after switching seeds.

## Outcome
- `ExpeditionPanel.tsx`: snapshot gains `bySellsword`; the end-transition side-effects gate on it.
- `App.tsx`: `restart()` re-arms the celebration refs.
- Tests (+2): a standalone-ExpeditionPanel transition test pair — a PLAYER dive (sellsword off) ending in combat fires `onDelveEnd` + `onToast`; a SELLSWORD dive (sellsword on) ending fires NEITHER. 352/352 unit, 9/9 e2e. FINDINGS #162.

## Gates
- [x] Player dive logs + toasts; sellsword dive does neither (render-transition tests)
- [x] Reference-verified the sellsword/slot sharing before fixing
- [x] Typecheck + 352 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Note
The component-effects review (brick 128's input) found this where the 12u pure-helper review found nothing — effects ARE where the bugs were. Remaining MEDIUM/LOW review notes (Space vs App-shortcut BUTTON-guard inconsistency) are pre-existing + cosmetic, left as-is.
