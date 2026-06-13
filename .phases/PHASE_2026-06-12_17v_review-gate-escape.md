# Phase: Exchange Wars — Phase 17v: Review (17q–17u) + gate Escape on help-open (Brick 256)

**Started:** 2026-06-12
**Hat:** Maintainer (Draft-Review-Merge — Review of 17q–17u)
**Goal:** Run the adversarial review on 17q–17u and fix the real finding. Verdict SOUND; the one actionable
(LOW): the 17u `Escape → closeHelp()` branch fires `closeHelp` on EVERY Escape (even when help is closed), so
its seen-flag write runs redundantly — and, via the `?`-key toggle path, an Escape after `?`-closing the
first-run help would mark it seen (a peek shouldn't count as dismissal). Gate the branch on whether help is
actually open: Escape only dismisses (and marks seen) an OPEN help.
**Done condition:** Escape closes an open help (mark seen); Escape after `?`-closing the unseen help does NOT
mark it seen; suite + e2e green.

## Why this brick
The reviewer traced the goal chart line (readGoal robustness, range-fold can't push elements off-canvas),
the compact nth-child indices (match the column map), stepSpeed (clamp/resume), and Escape-vs-filter-Escape
composition → **SOUND**. One LOW: `Escape → closeHelp()` unconditionally. The "Escape before ever seeing the
help" worry can't occur (help auto-opens on a fresh device), but the related real case is the `?`-toggle:
pressing `?` closes the first-run help WITHOUT marking it seen (a peek), and a subsequent Escape would mark it
seen via `closeHelp`. Gating on help-open makes Escape mean exactly "dismiss the OPEN modal" — consistent
with `?` being a non-committal peek.

## Design — mirror helpOpen in a ref, gate the Escape branch
- `App.tsx`: `const helpOpenRef = useRef(helpOpen); helpOpenRef.current = helpOpen;` (fresh each render, so the
  once-bound listener reads the current value with no stale closure). The Escape branch becomes
  `if (e.key === 'Escape') { if (helpOpenRef.current) closeHelp(); return; }` — still consumes Escape, but
  only acts on an open help.

## Scope (in)
- `App.tsx`: `helpOpenRef` + gate the Escape branch
- `app.test.tsx`: Escape after `?`-closing the unseen help leaves `HELP_SEEN_KEY` null (the existing 17u
  open-close test still passes)

## Scope (out)
- No change to the 17q–17u features (all SOUND); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] Escape on open help → closes + marks seen; Escape after `?`-closing the unseen help → still unseen (the test would fail without the gate)
- [x] the existing 17u test (Escape closes the open overlay) still green
- [x] UI suite (420, +1) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)
- [x] Adversarial review of 17q–17u: **SOUND** (goal chart line robustness, compact nth-child indices, stepSpeed clamp/resume, Escape composition all verified); the LOW closed

## Open questions
- None — the mirror-ref reads current state without a stale closure; the gate makes Escape's seen-flag write precise.
