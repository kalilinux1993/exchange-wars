# Phase: Exchange Wars — Phase 10u: Corrupt-Save Recovery (Brick 73)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (robustness — pivot off the daily arc for breadth)
**Goal:** Make the corrupt-save quarantine recoverable: surface a boot banner with download/discard so an unreadable save isn't silent data loss. UI-only, no engine change.
**Done condition:** boot banner when `CORRUPT_SAVE_KEY` exists, download rescues the raw bytes (re-importable), discard clears the quarantine; tests; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `loadCorruptSave()` / `discardCorruptSave()` next to `loadGame`/`clearSave` — centralizes the quarantine-key access (App no longer pokes raw localStorage), making the round-trip unit-testable.
- `App.tsx`: `useState(() => loadCorruptSave())` reads the quarantine once at boot; a `.corruptbar` (red, role=alert) recovery banner above the away/challenge bars with **download old save** (Blob+anchor, same mechanism as `exportSave`, filename `exchange-wars-recovered-save.json` → re-importable via existing file-import), **discard** (clears quarantine + hides), **×** (keep for next boot).
- `styles.css`: `.corruptbar` warning red, distinct from the neutral gold `.awaybar`.
- Tests: pure round-trip (`loadCorruptSave`/`discardCorruptSave`) + render (banner shows for a quarantine, discard clears `CORRUPT_SAVE_KEY` and dismisses; absent with no quarantine). 224/224 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #107.

## Notes
- Reading first caught that the queued "market-row sparkline" was already built (`Spark` in `MarketTable.tsx`) — picked corrupt-save recovery instead. NEXT_STEPS line was stale.

## Gates
- [x] Banner shows for a quarantine; download rescues bytes; discard clears it (render + pure tests)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
