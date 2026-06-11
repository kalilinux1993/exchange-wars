# Phase: Exchange Wars — Phase 11c: Flip Efficiency & Limit (Brick 81)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (trading decision-info — make TopFlips rows say more without guessing)
**Goal:** Enrich each best-flip row with return-on-cost % and the GE buy limit (both well-defined from data), keeping the ranking on absolute margin (no order-flow guesswork). UI-only, no engine change.
**Done condition:** `rankFlips` carries `roi`/`limit`; rows show return % + a `≤limit` badge; existing tests survive; new tests + suite + e2e green. **MET.**

## Outcome
- `components/TopFlips.tsx`: `FlipPick` gains `roi` (`margin/buy`) and `limit` (`buyRemaining ?? null`); `rankFlips` input widened to read optional `buyRemaining`. Ranking unchanged (absolute margin). Rows render `+margin <roi%>` and a dim `≤limit` badge on the buy→sell span (omitted when unlimited); tooltip names both + the tax.
- `styles.css`: `.flimit` / `.froi` (dim, smaller).
- No App change — `view.markets` already carries `buyRemaining`.
- Decision logged: realizable-profit RANKING needs an order-flow model the UI can't verify, so it'd present a guess as fact — declined; showed honest metrics instead.
- Tests: `rankFlips` roi/limit (finite + null) + a render asserting `≤500` and `7.7%`. Existing rankFlips/TopFlips tests survived (toMatchObject/length/map, not full toEqual). 250/250 unit (+2), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #115.

## Gates
- [x] roi + limit carried, null when unlimited (pure tests)
- [x] Row shows return % + buy-limit badge (render test); existing tests intact
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
