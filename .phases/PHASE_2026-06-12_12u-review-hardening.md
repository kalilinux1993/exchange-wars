# Phase: Exchange Wars — Phase 12u: Adversarial-Review Hardening (Brick 125)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Reviewer → Builder (the "Review" step of Draft-Review-Merge, after 20 rapid feature bricks)
**Goal:** Adversarially review the ~25 pure helpers added this session for correctness/edge-case bugs; fix what's real, pin what's verified-sound. UI-only, live on main.
**Done condition:** review run, findings triaged, the one flagged item addressed, edge cases pinned as regression tests; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
20 feature bricks shipped fast. Per the methodology, that's exactly when to stop and review. A skeptical agent attacked the session's helpers (portfolio math, combat forecast, break-even, delve aggregates) hunting for divide-by-zero, NaN, non-terminating loops, and bad edge cases.

## Review verdict: SOUND
The helpers are correct for their input domain. Confirmed by the reviewer + pinned empirically:
- `expectedHit` can never return 0 (`hi ≥ 2`, `lo ≥ 1`, floored at 1) → `combatForecast`'s `hp / expectedHit(...)` and `(... + foeHitBonus)` divisors are always ≥ 1. No divide-by-zero even at `atk=0` / `def=huge`.
- `breakEvenSell`'s tighten loops terminate for every input (0, 0.02, 1, ≥1, 1e9 basis) and stay exact.
- Empty/undefined handling is consistent (`?? []`/`?? {}`, `length > 0` / `total > 0` guards) — no NaN reaches a `.toFixed()` or a bar width.

## The one finding (MEDIUM, non-firing)
`worthBreakdown`'s `Math.max(0, total − cash − buyOrders)` could *hide* an inconsistency. But `view` and `total` (`playerWorth`) come from the SAME engine snapshot, and a buy order's `escrowGp == remaining*price` exactly, so the residual IS the bid-walk holdings value (≥ 0) — the clamp never fires; it's a torn-snapshot display guard, not a real floor. Addressed with a comment documenting the proof rather than a behavior change (changing it risked showing a negative for an impossible case).

## Outcome
- `game.ts`: a clarifying comment on `worthBreakdown`'s clamp (why it's provably a no-op under consistent snapshots).
- Tests (+4): regression pins for the adversarially-probed edges — `expectedHit`/`combatForecast` finiteness at `atk=0`; `breakEvenSell` boundaries (0, 1, 1e9 — terminates + exact); `positionConcentration([])` / `raidTotals(undefined)` no-NaN; `worthBreakdown` over-escrow clamp. 346/346 unit, 9/9 e2e. FINDINGS #159.

## Gates
- [x] Adversarial review run (verdict SOUND, 1 non-firing note)
- [x] Edge cases pinned as regression tests
- [x] Typecheck + 346 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required (no runtime behavior change — comment + tests)

## Note
No user-visible change this brick — the app behaves identically; it's now provably hardened against the probed edges, and the session's helpers carry a clean adversarial bill of health. Next firing resumes feature work.
