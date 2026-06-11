# Phase: Exchange Wars — Phase 10q: Daily Seed (Brick 69)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (social/retention — make the per-seed board a shared daily race)
**Goal:** Derive a shared seed from today's UTC date so every player can race the same world daily, turning the per-seed leaderboard into a synchronized global board. UI-only, no engine change.
**Done condition:** `dailySeed()` helper + a "🗓 daily" seed button that pre-fills the seed-draft soft-confirm; test pins the UTC mapping; suite + e2e green. **MET.**

## Outcome
- `game.ts`: `dailySeed(now = new Date())` → `YYYYMMDD` integer from UTC parts (next to `parseChallengeSeed`, the other seed-sharing helper). UI-only — reads the wall clock, which the engine never touches; it only *chooses* a seed for the existing `restart(seed)` path, so determinism is untouched.
- `App.tsx`: "🗓 daily" chip between "new game" and "challenge link"; `onClick` sets the seed-draft to `String(dailySeed())` (reuses the soft-confirm — can't nuke a run by accident).
- Test: `dailySeed` maps `Date.UTC(2026,5,11)`→20260611, Jan-1/Dec-31 edges, and a 23:59:59 UTC instant still resolves to the UTC calendar day (not local).
- 206/206 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #103.

## Gates
- [x] dailySeed UTC mapping pinned (test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
