# Phase: Exchange Wars — Phase 9q: Quarantine the Corrupt Save (Brick 43)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (robustness — boot-time save failure, the half the 9o boundary doesn't cover)
**Goal:** loadGame must (a) shape-gate like importSaveString so a parseable-but-wrong object can't normalize into a render-crashing Game, and (b) on any load failure QUARANTINE the raw save to `<key>-corrupt` before returning null, so the fresh game's first autosave can't silently destroy it.
**Done condition:** shape gate + quarantine shipped with a test asserting both "starts fresh" AND "garbage preserved"; suite + e2e green. **MET.**

## Outcome
- game.ts: CORRUPT_SAVE_KEY; loadGame now world+playerId gates, try/wraps normalize, and stashes the raw save on failure (console.error breadcrumb).
- Test: unparseable AND wrong-shape saves → null + quarantined original.
- 191/191 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #77.

## Gates
- [x] Both halves tested (fresh start + original preserved)
- [x] Suite + e2e green
