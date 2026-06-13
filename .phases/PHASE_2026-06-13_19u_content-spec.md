# Phase: Exchange Wars — Phase 19u: ready-to-implement spec for the parked engine-content batch (Brick 307)

**Started:** 2026-06-13
**Hat:** Designer/Scribe (the safe-build well is dry; convert idle saturation into executable content design)
**Goal:** The biggest remaining value is the Jesse-gated engine content (shallow-region elites, a defensive
altar event, a 9th region) — all replay-affecting, so they need the verify-score redeploy and can't ship
autonomously. Produce a CONCRETE, implementation-ready spec (`NEXT_CONTENT.md`) so Jesse can execute the whole
batch in one sitting: real numbers calibrated to the existing curve, exact files, the conservation/determinism
checklist, and the redeploy steps. Also correct a stale parked note (the defensive BREW already exists —
`divine_bastion_potion_4`; the parked item is the defensive ALTAR EVENT).
**Done condition met:** yes — `NEXT_CONTENT.md` specs three batches with concrete stats/mechanics grounded in
the real tables, the engine files + invariant checklist, and the redeploy procedure; NEXT_STEPS' stale note is
corrected; docs-only.

## Why this brick
17 implementation bricks shipped this session; the codebase is feature-complete, audited (7 bugs fixed), and
QA'd. The remaining high-value work is engine content, which I CANNOT ship safely (adding items/elites/regions
changes `hashState` → breaks the deployed verify-score replay until a coordinated redeploy). The highest-leverage
move is to design it precisely so the gated implementation is a fast, low-risk execution for Jesse — "thinking
up new ideas" made executable. Verifying the parked notes against the code already corrected one (the brew).

## Scope (in)
- `NEXT_CONTENT.md` (new): the three-batch content spec (shallow elites · defensive altar event · 9th region) +
  engine files + invariant/redeploy checklist
- `NEXT_STEPS.md`: correct the stale "defensive brew" parked note (brew DONE → defensive altar event parked)

## Scope (out)
- NO engine change (replay-affecting → Jesse + redeploy); no UI change; this is design only — the implementation
  is explicitly Jesse-gated and documented as such

## Subsystems touched
- NEXT_CONTENT.md (new) · NEXT_STEPS.md

## Gates
- [x] NEXT_CONTENT.md: concrete stats/mechanics for all three batches, calibrated to the existing curve
- [x] engine files + conservation/determinism checklist + verify-score redeploy steps documented
- [x] stale parked note corrected; docs-only (suite/bundle unchanged)

## Open questions
- Whether the 9th region introduces a NEW tradeable item (bigger market re-tune) or reuses existing goods (minimal disruption) — spec recommends the latter, flags the former as an option for Jesse.
