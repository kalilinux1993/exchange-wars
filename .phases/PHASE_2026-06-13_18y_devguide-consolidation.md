# Phase: Exchange Wars — Phase 18y: DEV_GUIDE consolidation (18n–18x: the audit-seam chapter) (Brick 285)

**Started:** 2026-06-13
**Hat:** Scribe (project hygiene — fold the audit chapter into the navigable record)
**Goal:** Consolidate the 11 bricks since the last fold (18n–18x, FINDINGS #300–#311) into a newest-first
DEV_GUIDE section and bump the banner to "Phase 1 → 18x". These bricks are the session's defining arc — the
audit seams (reference-verify money/combat, visual-QA layout, a11y, keyboard completion) that, as features
saturated, caught 5 real bugs a green suite couldn't see.
**Done condition met:** yes — banner reads "Phase 1 → 18x"; an "18n–18x consolidated" section groups the
audit-seam work thematically with FINDINGS #300–#311 cites; gates confirm no code touched (doc-only).

## Why this brick
The consolidated guide was last folded at 18n (through 18m); since then 18o–18x added the audit chapter:
4 reference-verify money/combat bug fixes (combatForecast accuracy 18o, bidWalk tax 18p, realized-P&L tax
18w, deathRecap keepN 18g) + 2 verified sound (worthBreakdown, flipMargin), the visual-QA Hall void fix
(18t), the a11y stepper labels (18v), keyboard-playable combat (18q/18u), and a SOUND review (18r). This is
the most valuable work of the session (real bugs, on the core loop), and it belongs in the navigable record,
not just `.phases/`/FINDINGS. Concluded the next FEATURE is genuinely marginal (saturation across every
dimension), so an overdue consolidation that captures the audit arc is the higher-value use of the firing.

## Design — one newest-first section + banner bump
- `DEV_GUIDE.md`: banner "Phase 1 → 18m" → "Phase 1 → 18x"; insert a "Phases 18n–18x consolidated" section
  (after the banner, before 17w–18m) with sub-sections: the reference-verify money/combat seam (4 fixed, 2
  sound), visual-QA layout (Hall void), a11y + keyboard completion, the review. Cites FINDINGS #300–#311.

## Scope (in)
- `DEV_GUIDE.md`: banner + the consolidated 18n–18x section

## Scope (out)
- No code change (doc-only); FINDINGS/.phases hold per-brick detail (untouched); no engine change → no redeploy

## Subsystems touched
- DEV_GUIDE.md

## Gates
- [x] banner reads "Phase 1 → 18x"; the 18n–18x section groups the 11 bricks (4 sub-sections) with FINDINGS #300–#311 cites
- [x] typecheck clean + UI suite 453 unchanged (confirms doc-only, no code touched); e2e unaffected (build byte-identical to 18x)
- [x] no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — routine consolidation on the established cadence.
