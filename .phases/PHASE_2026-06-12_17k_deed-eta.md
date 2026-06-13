# Phase: Exchange Wars — Phase 17k: ETA to your next worth-milestone (Brick 245)

**Started:** 2026-06-12
**Hat:** Builder (retention — a forward-looking "you're almost there")
**Goal:** Show an ETA ("≈2h") next to each worth-based deed in the MilestonesPanel — at your recent gp/min
rate, how long until you EARN it. The named-goal sibling of the WorthChart's next-round-number ETA (11w).
**Done condition:** A worth deed (six-figures/doubled/quarter-m/millionaire/five-million) with a positive
worth rate shows an ETA beside its progress bar; non-worth deeds and a flat/falling rate show none; green.

## Why this brick
The MilestonesPanel shows the closest unearned deeds with progress bars (12z), but a % alone doesn't say
"how long?" The WorthChart already projects "≈{duration} to {next round number}" (11w) from `worthRate`;
extending that to NAMED deeds ("≈2h to gp Millionaire") right where the deed is shown is a stronger
motivation hook — a concrete finish line, not just a fraction. Only WORTH deeds get an ETA (worthRate is
gp/min — same units), so the metric matches the goal (the 13s gp-vs-worth caveat doesn't apply: deeds ARE
worth-thresholds).

## Design — tag worth deeds + a pure `deedEta`, reuse worthRate
- `game.ts`: `Milestone.paceMetric?: 'worth'`; tag the 5 worth deeds. `deedEta(progress, worth, perMin)` —
  derives the threshold from progress (`worth/progress`), returns `remaining/perMin` (tick-minutes, matching
  `worthRate`'s unit); null if rate ≤ 0 or progress is complete/not-started. Pure.
- `MilestonesPanel.tsx`: compute `worthRate(game.worthHistory)` once; carry each deed's RAW progress (not the
  floored pct) into the `next` rows; for `paceMetric === 'worth'` deeds with a non-null `deedEta`, render
  "≈{fmtDuration(eta*60)}" beside the bar (same `eta*60` tick conversion + fmtDuration as WorthChart).

## Scope (in)
- `game.ts`: `paceMetric` field + 5 tags + `deedEta`
- `MilestonesPanel.tsx`: rate + raw-progress + ETA render
- `app.test.tsx`: `deedEta` unit (threshold-from-progress, null guards) + a panel render (worth deed shows ETA, flat rate shows none)

## Scope (out)
- No ETA for non-worth deeds (combat/contract/region) — wrong units; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/MilestonesPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `deedEta` derives threshold from progress; null on rate≤0 / progress≥1 / progress≤0
- [x] worth deed with a rising history shows an ETA; flat rate shows none
- [x] UI suite (408, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — extends the established 11w worth-ETA pattern to named deeds.
