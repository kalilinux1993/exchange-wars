# Phase: Exchange Wars — Phase 21k: adversarial review of the session's new logic (Brick 329)

**Started:** 2026-06-13
**Hat:** Reviewer (Draft-Review-Merge "Review" gate — applied to a session of autonomous bricks)
**Goal:** After 12 build bricks (20e–21j), run an INDEPENDENT adversarial pass over the new helpers + their
wiring to catch any real bug (correctness, edge cases, state interactions) the per-brick unit tests missed —
before it compounds. Fix anything real; if clean, log the verification.
**Done condition met:** yes — review returned MINOR-CONCERNS; the one CONFIRMED MEDIUM bug (take/cut shared
`armed` cross-render mismatch, 21d) is fixed (key `armed` by item+action) + a regression test; the LOW
`outgrownFarm` -1 edge hardened + tested; the rest verified SOUND; suite 515, e2e 15, typecheck clean.

## Scope (in — highest-risk new logic)
- `staleOffers.cancelPairs` (game.ts) — the safety-critical "fully-stale pair only" bulk-abort logic (21e)
- PositionsPanel take-profit (21d) — shared `armed` state w/ cut + the `bid > breakEvenSell` gate
- `affordEta` (21a) + UpgradeShop wiring — liquidate/eta/slow, the worth-gap framing
- the handle lift (21b) — App source-of-truth ↔ LeaderboardPanel controlled-optional (divergence/persistence)
- `outgrownFarm` (21c) — tie-break + minDives + the EmbarkPanel read
- lighter sanity: `eventMove` (21i), `diveSurvival` (21j), the two deeds (21f/21g), `sortableProps` (20f)

## Gates
- [x] adversarial-reviewer agent run on the above; findings triaged by confidence
- [x] CONFIRMED MEDIUM (take/cut armed cross-render) fixed via item+action key + regression test; LOW (-1) hardened
- [x] verdict logged to FINDINGS #355; rest verified SOUND
- [x] typecheck clean; UI suite 515 (+2 regressions); e2e 15 (1 on-demand skip); UI-only, no redeploy

## Out
- Style/preference churn; engine code (Jesse-gated); re-reviewing pre-session code
