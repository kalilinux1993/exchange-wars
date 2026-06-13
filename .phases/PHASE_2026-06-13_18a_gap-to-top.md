# Phase: Exchange Wars — Phase 18a: Gap-to-#1 for top contenders (the summit target) (Brick 261)

**Started:** 2026-06-13
**Hat:** Builder (social/leaderboard — give a top contender the summit to chase)
**Goal:** Add a `gapToTop(rows, meRank)` helper + a gated Sprint Board line showing the worth gap to seize
**#1** (the leader's handle + the gp behind), shown only for top contenders at rank #3–#10 — distinct from
`rankGap`'s immediate climb (the rank directly above). At #2 it would duplicate `rankGap` (the rank above
IS #1), and at #11+ the leader is too far to be a live target.
**Done condition:** A ranked top contender (#3–#10) sees a "👑 {gap} gp behind #1 {leader}" line in
addition to the rank-above gap; #1/#2/unranked/#11+ don't; `gapToTop` is unit-pinned; suite + e2e green.

## Why this brick
The Sprint Board gives the immediate climb (`rankGap` 16a — the rank directly above) and a live provisional
standing (`provisionalRank` 16b). For someone near the top, the rank-above gap is the next step, but the
SUMMIT — overtaking #1 — is the real ambition, and that figure isn't shown unless #1 happens to be the rank
directly above you. A gap-to-#1 line gives top contenders the ultimate target alongside the next one: two
distinct climbs (the step / the summit). This is the social system's turn for breadth (untouched since
16a/16b) after a run of trading (17z), side-board (17x/17y), and adventure (17w) bricks.

## Design — a pure helper + a gated board line
- `LeaderboardPanel.tsx`: `gapToTop(rows, meRank): { gap; leader } | null` — `null` at unranked / #1
  (no leader above); otherwise `{ gap: max(0, rows[0].worth − mine.worth), leader: rows[0].handle }`.
  Mirrors `rankGap`'s shape/guards (floors the gap at 0 for a tie).
- The board line is gated in the component: shown only when `meRank` is 3–`TOP_CONTENDER_RANK` (10) — the
  anti-redundancy gate (#2's rank-above gap already IS the gap-to-#1) + the "top contender" scope.
- `👑 {gap} gp behind #1 {leader}`, `.gaptop`, placed right after the `.rankgap` line.

## Scope (in)
- `packages/ui/src/components/LeaderboardPanel.tsx`: `gapToTop` + `TOP_CONTENDER_RANK` + the gated line
- `packages/ui/test/app.test.tsx`: `gapToTop` unit (math + null at #1/unranked + tie floor) + import

## Scope (out)
- No gap-to-#1 for ranks #11+ (the leader isn't a realistic live target there — `rankGap` stays the lever)
- No engine change → no redeploy; the board self-gates on the backend (lights up where it's deployed)

## Subsystems touched
- packages/ui/src/components/LeaderboardPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `gapToTop` returns gap+leader (gap 2100 @ #3), null at #1/unranked, floors a tie at 0 — unit-pinned
- [x] board shows 👑 line at #3 with the summit gap (6,100) distinct from the rank-above climb (2,100) — render test
- [x] UI suite (428, +2: unit + render) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors `rankGap` (16a) exactly in shape, guards, and test style.
