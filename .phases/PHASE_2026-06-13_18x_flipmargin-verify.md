# Phase: Exchange Wars — Phase 18x: Verify flipMargin (qty-1-exact) + guard it against a wrong per-fill "fix" (Brick 284)

**Started:** 2026-06-13
**Hat:** Reviewer → Builder (close the money-path reference-verify; protect the verified behavior)
**Goal:** Complete the money-path reference-verify by checking `flipMargin` (the core "is this flip
profitable?" number). Verdict: SOUND — its per-unit `floor(sell·rate)` is EXACT for a 1-unit flip (the
engine floors tax per fill, and a 1-unit fill at price <50 genuinely pays 0 tax). Add a maintainer note +
a cheap-item test pinning the intentional qty-1 behavior, so the 18w per-fill realized-P&L fix isn't
reflexively (and wrongly) extended to this per-unit figure.
**Done condition met:** yes — flipMargin doc states it's qty-1-exact and must stay per-unit; a cheap-item
(<50) test pins the intentional 0-tax; suite + e2e green.

## Why this brick
18w fixed the realized BOOK (per-fill: it overstated cheap flips by flooring tax per-unit to 0). The danger
now: `flipMargin` ALSO floors per-unit (`floor(sell·rate)`, 0 below price 50) and looks like the same bug —
but it ISN'T. flipMargin is a PER-UNIT (qty-1) margin, and the engine floors tax per fill, so a 1-unit sell
at 33 genuinely pays `floor(33·0.02)=0` tax — flipMargin is EXACT for qty-1. The margin×qty > bulk-realized
gap is the inherent per-unit↔per-fill relationship (the realized book, qty-known, is per-fill; the margin,
qty-agnostic, is per-unit), NOT a defect. Reflexively "fixing" flipMargin to per-fill (after just doing 18w)
would be wrong. So: record the verification, note the invariant in the code, and pin the intentional cheap
behavior with a test. (Whether the column SHOULD instead show an at-scale `sell·rate` tax for bulk realism
is a deliberate balance/UX decision for Jesse — flagged, not autonomously re-tuned.)

## Design — a maintainer note + a pinning test
- `game.ts` `flipMargin` doc: it's the per-unit (qty-1) after-tax margin — exact for a 1-unit flip (engine
  floors tax per fill, so `floor(sell·rate)` == the qty-1 tax). Do NOT change to per-fill (that's the
  realized BOOK's job, 18w); a bulk cheap flip realizes slightly under margin×qty by the per-fill tax — by
  design of a per-unit figure.
- `app.test.tsx`: add a cheap-item assertion (`flipMargin({bestBid:30, bestAsk:33})` → 1, tax 0 — intentional).

## Scope (in)
- `packages/ui/src/game.ts`: flipMargin maintainer note
- `packages/ui/test/app.test.tsx`: a cheap-item flipMargin assertion pinning the qty-1 behavior

## Scope (out)
- No flipMargin VALUE change (it's correct per-unit); the at-scale-tax option flagged for a deliberate decision, not changed; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts (doc comment)
- packages/ui/test/app.test.tsx

## Gates
- [x] flipMargin doc records the qty-1-exact invariant + "don't per-fill-ify"; cheap-item (<50) test pins the intentional 0-tax
- [x] UI suite + e2e green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Flagged (Jesse's call): switch the margin column to an at-scale `sell·rate` tax for bulk-flip realism? Re-ranks cheap flips + a per-unit-tax-convention decision — deliberate, not autonomous.
