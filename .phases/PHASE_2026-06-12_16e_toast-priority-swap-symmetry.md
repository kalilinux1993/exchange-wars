# Phase: Exchange Wars — Phase 16e: refreshProgress toast-priority + swap-symmetry fix (Brick 213)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Maintainer (review-driven correctness)
**Goal:** Fix the two real issues an adversarial review found in `refreshProgress` (App.tsx): (1) rare
high-value CELEBRATIONS (level-up / new region / deed) are clobbered by frequent informational alerts /
event recaps because they fire EARLIER in last-writer-wins order; (2) the four one-shot alert `*Fired` Sets
are the only cross-tick detection state not re-baselined on a game swap.
**Done condition:** Celebrations fire LAST (win the toast slot on a collision); the `*Fired` Sets clear on a
game-identity change (swap symmetry); existing tests + suite + e2e green, no regression.

## Why this brick
After 15 rapid Draft-Merge bricks the methodology's Review step was overdue; an adversarial pass on
`refreshProgress` (now ~7 stateful detection loops) self-corrected its own first finding to "sound" and
surfaced two genuine ones (and confirmed the rest correct — re-arm complete on all four loops, null guards
clean, baseline swap-guards correct). Both are real-but-low-severity, exactly what a review catches that
green tests don't: an ordering bug (a level-up celebration silently dropped for a co-occurring event recap)
and a swap-guard asymmetry (the alert Sets survive a swap while every other cross-tick ref re-baselines).

## Design — reorder + one swap-clear block
- **Priority (last-writer-wins ⇒ call LAST = highest):** move the celebration block (level-up →
  region-unlock → milestone, which already orders itself fills<level<region<deed) to the END of
  `refreshProgress`, AFTER the price/sell/band/rich alert loops and the event-end recap. So a rare identity
  moment wins the single slot over a frequent alert; fills stays first (lowest); informational toasts sit in
  the middle. `lv`/`prog`/`newly` move with the block (nothing between references them; `w` stays in scope).
- **Swap symmetry:** after the fills toast, a `levelBaselineGame.current !== game` check clears the four
  `*Fired` Sets. Fire-FRESH on adopted state is correct for INFORMATIONAL alerts (unlike celebrations, which
  suppress) — "your watched X is cheap" on save-load is accurate, not a false achievement. The level/progress/
  event baselines keep re-latching in their own `game`-keyed blocks. Read-only of `levelBaselineGame` here
  (it's written only in the moved celebration block, so the swap is detectable for the whole tick).
- Pin the `prevProgress`↔`prevLevels` lockstep coupling with a comment (the review's LOW footgun).

## Scope (in)
- `App.tsx`: reorder `refreshProgress` (celebrations to the end) + the swap-clear block + the coupling comment

## Scope (out)
- No new detection; no change to any toast's content or to the alert/celebration LOGIC (only ORDER + the
  swap-clear); no engine change

## Subsystems touched
- packages/ui/src/App.tsx

## Gates
- [x] celebrations now fire AFTER the alert/event loops (level/region/deed are the last setToast calls); all 361 existing tests stay green (reorder broke nothing → behavior-preserving per detection)
- [x] the four `*Fired` Sets clear on a `game`-identity change; re-arm logic + baseline swap-guards unchanged
- [x] UI suite (361) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)
- Note: a dedicated collision-priority test (level-up + event-end same tick) is brittle to set up
  deterministically; guarded instead by the per-detection tests + the explicit "Celebrations LAST" intent comment.

## Open questions
- None — both fixes are behaviour-preserving except the intended priority/symmetry change; review verdict was the rest is sound.
