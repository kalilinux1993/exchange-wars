# Phase: Exchange Wars — Phase 9b: Death, Remembered (Brick 28)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (death deserves drama — and a ledger line)
**Goal:** Specific death recaps (region, kept items, lost units + loot gp) via a last-render snapshot in the panel's death-detection ref; engine counts deaths (stats.deaths); tally shows N†; Nine Lives deed (9 deaths, with progress).
**Done condition:** recap + counter + deed shipped with tests; suite + e2e green; fn redeployed. **MET.**

## Outcome
- engine: stats.deaths in expeditionDeath (one line); death test asserts it.
- ui: deathRecap pure helper mirrors the keep-3 rule (unit-tested: top-3-by-cost kept, remainder + gp lost); panel snapshot ref feeds the toast; tally line gains N† deaths; Nine Lives deed.
- 178/178 unit; 9/9 e2e; fn redeployed (77.5kb). FINDINGS #62 (ephemeral drama = UI snapshot; durable score = engine stat).

## Gates
- [x] Recap math mirrors engine keep-3 (unit test)
- [x] Suite + e2e green; fn redeploy (stats shape)
