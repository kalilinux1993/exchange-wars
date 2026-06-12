# Phase: Exchange Wars — Phase 11r: Daily Board Framing (Brick 96)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (connective — tie the daily seed to the leaderboard)
**Goal:** When the active seed is today's daily, reframe the Sprint Board as the Daily Board (the shared daily competition). UI-only, live on main.
**Done condition:** `seed === dailySeed()` reframes the header/subtitle; suite + e2e green. **MET.**

## Outcome
- `components/LeaderboardPanel.tsx`: `isDaily = seed === dailySeed()`; header → "🗓 Daily Board" and subtitle → "today's shared world — everyone racing the daily competes here · …" when on the daily, else "Sprint Board · seed N · …". No new data/fetch — both systems were already seed-keyed.
- Compounds with 11q: "you're #N on this seed" reads as your daily-race standing on the daily.
- Tests: render on `newGame(dailySeed())` → "🗓 Daily Board" + "everyone racing the daily"; seed-42 tests still see "Sprint Board". 266/266 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #130.

## Gates
- [x] Header reframes on the daily seed (render test); non-daily unchanged
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
