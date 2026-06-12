# Phase: Exchange Wars — Phase 11q: "You" on the Sprint Board (Brick 95)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (competitive UX — find yourself on the leaderboard)
**Goal:** Highlight the player's own row + rank on the Sprint Board, matched by handle (no user-id exposure). UI-only, live on main.
**Done condition:** pure `myRank` (guards anonymous/empty); row highlight + "← you" + "you're #N"; suite + e2e green. **MET.**

## Outcome
- `components/LeaderboardPanel.tsx`: `myRank(rows, rawHandle)` (pure) — sanitized-handle match (email→local part, server-consistent), null for empty/whitespace or the `'anonymous trader'` fallback. Render: `.you` gold-highlighted row + "← you" marker + "you're #N on this seed" line, all keyed on `meRank === i+1`.
- `styles.css`: `.sprintboard li.you` subtle gold left-border highlight.
- Matched by handle (not user_id) because `fetchLeaderboard` selects only `handle,worth,deepest` — respecting the schema's intent not to expose auth UUIDs publicly.
- Tests: pure `myRank` (rank by handle, email-shaped, not-found, anonymous/empty → null) + a render via the `fetchRoutes` stub (handle in localStorage, two rows → "← you" + "you're #2"). 265/265 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #129.

## Gates
- [x] myRank matches by handle, guards anonymous/empty (pure tests)
- [x] Own row highlighted + rank line (render test via Supabase stub)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
