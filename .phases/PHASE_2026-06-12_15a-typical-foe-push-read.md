# Phase: Exchange Wars — Phase 15a: Typical-Foe Push Read (Brick 183)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — combat decision-support)
**Goal:** Stop the push read over-scaring in elite regions — alongside the HARDEST-foe verdict,
show a "usually favored/risky" tag for the TYPICAL foe, but only when the two disagree.
**Done condition:** The mid-dive push read appends "· usually {favored/risky}" when the typical
foe's forecast verdict differs from the hardest's; suite + e2e green.

## Why this brick
The push read (13p) judges survival vs the region's HARDEST foe — but in elite regions that's a
rare named terror (Vorkanth, Skarn, Vessith), so "risky" can scare you off banking-vs-pushing when
the common encounter is fine. Adding the typical-foe verdict distinguishes "the worst case is dicey"
from "you're outmatched here." Fresh subsystem (combat) after a market/gear/idle run; the 13p/14o
follow-up flagged in NEXT_STEPS ("show the TYPICAL foe alongside the hardest").

## Design — typical-foe helper + a gated tag
- `regionTypical(region)` (ExpeditionPanel, exported, pure): the AVERAGE atk/def/hp of the regular
  encounter pool (`region.monsters`), elite EXCLUDED — the elite is the rare worst `regionDanger`
  already covers. What you usually meet.
- Push read: forecast at current hp vs `regionTypical` (dragonfire-aware over the pool), and append
  "· usually <favored/risky>" ONLY when `ft.favored !== f.favored` — i.e. when the typical and
  hardest verdicts disagree (the over-scare case). When they agree it adds nothing, so the line stays
  clean.

## Scope (in)
- `ExpeditionPanel.tsx`: `regionTypical` + the gated tag in the push read
- `app.test.tsx`: `regionTypical` unit (pool average) + "elite meaner than pool" + a negative render
  (wounded → both risky → no tag)

## Scope (out)
- No change to the hardest-foe verdict (still the headline — the conservative read), the food cushion,
  or the bank nag; no engine change

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `regionTypical` averages the pool (≤ hardest always; strictly < for wilderness_ruins); empty → zeros
- [x] the "usually" tag is absent when verdicts agree (hp-8 base diver in the Maw → both risky)
- [x] UI suite (322, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Coverage: the helper + the negative-render (gating) are tested; the positive tag is the symmetric
  branch of the same `!==` boolean, so it follows from the negative + the helper (honest accounting).
