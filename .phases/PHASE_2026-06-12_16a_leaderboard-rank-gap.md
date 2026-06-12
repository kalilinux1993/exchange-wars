# Phase: Exchange Wars — Phase 16a: Leaderboard Rank Gap (Brick 209)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — competitive motivation)
**Goal:** On the Sprint/Daily board, when you're ranked but not #1, show the concrete gap to the rank
directly above — "🎯 {gap} gp behind #{rank} {handle}" — so "how do I climb?" has a number, not just a position.
**Done condition:** A ranked player below #1 sees a rank-gap line naming the worth difference + handle of
the rank above; absent when unranked or already #1; suite + e2e green.

## Why this brick
The board shows your rank ("you're #5 on this seed") and the rows, but the competitive HOOK — "what would
it take to climb one spot?" — is left as mental arithmetic across two rows. A rank-gap readout turns the
board from a static standings list into a target: the exact fortune you'd need at the sprint mark to
overtake the player above you. Fresh work in the leaderboard/competitive surface (untouched since 11q's
`myRank`), and a pure breadth pivot away from the long trading/adventure/atmosphere run. Data is already
fetched (board rows carry `worth` + `handle`); no engine change, no new cloud call.

## Design — a pure helper beside `myRank` + one board line
- `LeaderboardPanel.tsx`: `rankGap(rows, meRank)` → `{ gap, rank, ahead } | null`. `meRank` is 1-based, so
  your row is `rows[meRank-1]` and the row above is `rows[meRank-2]`; `gap = max(0, above.worth - mine.worth)`,
  `rank = meRank-1`, `ahead = above.handle`. `null` when unranked or already #1. Pure.
- Render a "🎯 {gap} gp behind #{rank} {ahead}" line right under the existing "you're #N" line.

## Scope (in)
- `LeaderboardPanel.tsx`: `rankGap` + the gap line
- `app.test.tsx`: `rankGap` unit (gap to the row above; null at #1 / unranked)

## Scope (out)
- No gap-to-leader (#1) line this brick (next-rank is the actionable target; leader-gap is a possible
  follow-up); no live projection of your CURRENT worth vs the board (the board is sprint-mark scores); no engine change

## Subsystems touched
- packages/ui/src/components/LeaderboardPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `rankGap` returns the worth gap + handle of the rank directly above; null at #1 and when unranked
- [x] the board shows the "🎯 … behind #N {handle}" line for a ranked non-#1 player
- [x] UI suite (358, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the fetched board rows + `myRank`.
