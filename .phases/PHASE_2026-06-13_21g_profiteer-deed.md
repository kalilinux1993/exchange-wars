# Phase: Exchange Wars — Phase 21g: "Profiteer" deed — reward realized flip PROFIT (Brick 325)

**Started:** 2026-06-13
**Hat:** Builder (progression∩trading — a deed for the core loop's SUCCESS, the safe content lever from 21f)
**Goal:** No deed rewards actually MAKING money flipping. The worth tiers (100k/1M/5M) count NET WORTH —
reachable by idle accrual on the starting stake, not necessarily by trading; "big-leagues" rewards a big
FILL, not profit. Add "Profiteer" keyed on lifetime REALIZED flip profit (the FIFO trade book).
**Done condition met:** yes — a new MILESTONES entry `profiteer` whose `achieved` is `totalRealized(g.tradeBook)
>= 100_000` (progress `/100_000`), reusing the tax-accurate (18w) realized-P&L the scorecard already shows;
unit test (not at a sub-bar round-trip, achieved at a bigger spread, latches via checkMilestones); suite +
e2e green; typecheck clean.

## Design
- `achieved: (g) => totalRealized(g.tradeBook) >= 100_000` — `totalRealized` sums `book.realized[*].profit`
  (lifetime, after the per-fill 2% tax fixed in 18w), reads only `g.tradeBook` (UI-side, rebuilt by
  normalizeGame from fills). Deeds are replay-inert (checkMilestones never runs in replayRun), so UI-only.
- Placed in the trading-achievement cluster (after `big-leagues`). Distinct from the worth tiers: this is
  trading PROFIT (must complete profitable round-trips), not net worth (idle-reachable).

## Scope (in)
- packages/ui/src/game.ts (one MILESTONES entry)
- packages/ui/test/app.test.tsx (deed unit test via bookFromFills, modeled on the apex/untouchable deed tests)

## Scope (out — explicit non-goals)
- No engine change (deeds UI-side) → no redeploy; no new helper (reuses `totalRealized`)
- Not a tiered ladder (one meaningful 100k rung; a bigger capstone can follow if wanted)

## Subsystems touched
- packages/ui/src/game.ts (MILESTONES)
- packages/ui/test/app.test.tsx

## Gates
- [x] profiteer: not achieved on a ~76k round-trip; achieved on a ~145k one; progress = realized/100k; latches
- [x] typecheck clean; UI suite 508 (+1); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- A higher capstone (1M realized?) could pair with this later — defer until this rung is in.
