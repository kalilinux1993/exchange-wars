# Phase: Exchange Wars — Phase 18n: DEV_GUIDE consolidation pass (17w–18m) (Brick 274)

**Started:** 2026-06-13
**Hat:** Scribe (project hygiene — bring the navigable record current)
**Goal:** Fold the 17 bricks since the last consolidation (17w–18m, FINDINGS #285–#301) into a newest-first
DEV_GUIDE section and bump the banner to "Phase 1 → 18m", so the consolidated guide isn't 17 bricks stale
(those currently live only in `.phases/` + FINDINGS). Record the see→act actionability-arc completion.
**Done condition:** DEV_GUIDE banner reads "Phase 1 → 18m"; a "17w–18m consolidated" section groups the 17
bricks thematically; gates confirm no code was touched (doc-only).

## Why this brick
The consolidated DEV_GUIDE is the navigable record (per-brick detail is in `.phases/`/FINDINGS); it was last
folded at 17v, so 17w–18m (the actionability arc, momentum tooling, the leaderboard summit, the death-stakes
fix from review 18g, book-hygiene readouts, the help refresh, visual coherence) aren't in it. Periodic
consolidation is the established cadence (the prior section folded 16w–17v); doing it now keeps the guide
honest and captures a real milestone — the see→act actionability arc is complete across all four
"states-a-fact" surfaces (events 15l → contracts 17y → bounties 18f → ticket farm line 18m). Concluded the
next FEATURE would be polish-tier marginal; an overdue doc consolidation is the higher-value use of the firing.

## Design — one newest-first section + banner bump
- `DEV_GUIDE.md`: update the banner "Phase 1 → 17v" → "Phase 1 → 18m"; insert a "Phases 17w–18m consolidated"
  section (after the banner, before the 16w–17v section) with thematic sub-sections: actionability arc,
  momentum tooling, leaderboard summit, adventure risk⟷reward, feedback/book-hygiene, progression/onboarding/visual,
  + the 2 reviews (18g caught real bugs). Cite FINDINGS #285–#301.

## Scope (in)
- `DEV_GUIDE.md`: banner + the consolidated 17w–18m section

## Scope (out)
- No code change (doc-only); no engine change → no redeploy; FINDINGS/.phases already hold per-brick detail (untouched)

## Subsystems touched
- DEV_GUIDE.md

## Gates
- [x] banner reads "Phase 1 → 18m"; the 17w–18m section groups all 17 bricks (6 thematic sub-sections) with FINDINGS #285–#301 cites
- [x] typecheck clean + UI suite 444 unchanged (confirms doc-only, no code touched); e2e unaffected (build byte-identical to 18m's green run)
- [x] no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — a routine consolidation pass on the established cadence.
