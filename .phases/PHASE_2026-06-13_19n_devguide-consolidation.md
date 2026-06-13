# Phase: Exchange Wars — Phase 19n: DEV_GUIDE consolidation 18y–19m (Brick 300, the round-number consolidation)

**Started:** 2026-06-13
**Hat:** Scribe (consolidate the record — the round-number-brick law, FINDINGS #67)
**Goal:** The DEV_GUIDE's consolidated record stops at 18x; 14 bricks (18y, 18z, 19a–19m) live only in
`.phases/` + FINDINGS + NEXT_STEPS. Fold them into a single newest-first DEV_GUIDE section and bump the banner
to 19m, so the guide stays the navigable index it's meant to be.
**Done condition met:** yes — a new "Phases 18y–19m consolidated" section captures the distribution/data-safety
sub-arc, the combat-survivability ladder on the verified damage math, the trading-instrument suite, and the
three recurring lessons; the banner reads "Phase 1 → 19m"; docs-only (no code), so the suite is unchanged.

## Why this brick
Brick 300 is a round number, and the project's operational law (FINDINGS #67) is "round-number brick =
consolidation." The DEV_GUIDE is the cross-session index; 14 un-folded bricks since 18y make it stale as a
map. Consolidating keeps future-self (and reviewers) able to find the shape of the 19-series without reading 14
.phases files, and surfaces the session's through-lines (engine-mirror seam, displayed-value-flatters-reality,
derive-from-engine-structure, expected-vs-worst-case) as named lessons rather than scattered findings.

## Design — one newest-first section + banner bump
- `DEV_GUIDE.md`: prepend "Phases 18y–19m consolidated …" above the 18n–18x section, grouped as: distribution
  + data-safety (18y–19d); the combat-math fix + survivability ladder (19e/19f/19g/19m); the trading-instrument
  suite (19h–19l); the three lessons. File:line anchors + FINDINGS #312–#325. Bump the banner (Phase 1 → 19m).

## Scope (in)
- `DEV_GUIDE.md`: new consolidated section + banner

## Scope (out)
- No code change (docs-only — suite/e2e unchanged, bundle hash won't move); no edit to FINDINGS/.phases (the
  per-brick record stays); no engine change → no redeploy. NEXT_STEPS Quality bullets stay (running log).

## Subsystems touched
- DEV_GUIDE.md

## Gates
- [ ] DEV_GUIDE has the 18y–19m section; banner reads 19m; anchors resolve
- [ ] typecheck + suite (475) + e2e (13) unchanged (docs-only)
- [ ] no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — consolidation only; the 19-series code already shipped + verified live.
