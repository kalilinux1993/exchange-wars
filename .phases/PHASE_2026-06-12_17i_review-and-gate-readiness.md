# Phase: Exchange Wars — Phase 17i: Adversarial review + gate EmbarkPanel readiness compute (Brick 243)

**Started:** 2026-06-12
**Hat:** Maintainer (Draft-Review-Merge — the Review step on the session's 12 bricks)
**Goal:** Run the overdue adversarial review on this session's UI changes (16w–17h, commits d0dda5f..b0cf039)
and fix anything real it finds. Verdict was SOUND; the one actionable item: gate the EmbarkPanel's
`diveReadiness` compute below the `if (agent?.expedition) return null` early return so it doesn't scan every
region (combatForecast × REGIONS) on every render WHILE diving, when the panel renders nothing.
**Done condition:** `eff`/`readiness` are computed only on the render path that uses them (below the early
return); behaviour unchanged; suite + e2e green.

## Why this brick
12 feature bricks shipped without an explicit Review pass. The adversarial-reviewer agent traced the per-tick
hot path, the celebration swap-guards, stale closures, the deed fix, and the filter predicates → **SOUND**,
with one LOW: 17g hoisted `eff = deriveStats(...)` + `readiness = diveReadiness(...)` to the top of
EmbarkPanel, ABOVE the early return that bails during an active dive — so both compute every render even when
the component returns null. "Computed once" (per render) was true but not GATED. Move them below the early
return: same result when rendering, zero work while diving.

## Design — move two consts past the early return
- `EmbarkPanel.tsx`: relocate the `eff`/`readiness` consts (and their comment) from above the hooks to
  immediately AFTER `if (agent?.expedition) return null;`. They're pure consts (not hooks), used only in the
  returned JSX (the RegionMap `recommended` prop + the readiness readout), so this is rules-of-hooks-safe and
  behaviour-identical on the render path.

## Scope (in)
- `EmbarkPanel.tsx`: move `eff`/`readiness` below the early return

## Scope (out)
- The MEDIUM (per-tick `newElites` allocation in refreshProgress) — same shape as the existing
  checkMilestones/alert loops, not a regression; the reviewer flagged it as not worth a fast-path. Left as-is.
- No engine change — no redeploy; no behaviour change

## Subsystems touched
- packages/ui/src/components/EmbarkPanel.tsx

## Gates
- [x] `eff`/`readiness` computed below the early return; readout + map ring still correct; typecheck confirms no rules-of-hooks/TDZ issue
- [x] UI suite (405, unchanged — behaviour-identical) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)
- [x] Adversarial review of 16w–17h: **SOUND** (swap-guards, stale closures, deed fix, predicates all verified); this LOW closed, MEDIUM left as documented

## Open questions
- None — the review verdict was SOUND; this is the single LOW finding closed.
