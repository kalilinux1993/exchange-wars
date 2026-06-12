# Phase: Exchange Wars — Phase 15n: Extract Recap (Brick 196)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — dive closure / feedback)
**Goal:** Give a successful extract the closure a death already has — a "🎒 Returned from {region}:
banked N gp · M cleared" toast — the positive counterpart to the death recap.
**Done condition:** Extracting out of combat with loot or kills fires a return-recap toast; a record
haul still shows the "New best haul!" toast on top; an empty extract stays quiet; suite + e2e green.

## Why this brick
A death toasts a recap (`deathRecap` — what you kept/lost); a successful extract toasted NOTHING
(only the Delve Log entry + a record's best-haul toast). So an ordinary good dive ended silently —
no "you made it out with the haul." The recap is the satisfying close of the push-your-luck loop
(extract vs push). Fresh combat-side brick (non-market).

## Design — extract branch + ordering for the best-haul toast
- In the dive-end handler, add an `else` to the `if (died)`: when NOT died and there's something to
  show (`packGp > 0 || cleared > 0`), `onToast("🎒 Returned from {where}", "banked N loot gp · M
  cleared")`. Hoist `where` (used by both branches).
- CRUCIAL ordering: move `onDelveEnd(...)` to AFTER the local toasts. App's best-haul detection lives
  in `onDelveEnd`; firing the extract toast FIRST and `onDelveEnd` (→ best-haul on a record) LAST means
  a record extract shows "🏆 New best haul!" on top, an ordinary one shows the return recap.
- Gate on `packGp > 0 || cleared > 0` so an immediate extract (nothing gained) doesn't toast a hollow
  "banked 0 gp · 0 cleared".

## Scope (in)
- `ExpeditionPanel.tsx`: the extract recap branch + the onDelveEnd reorder
- `app.test.tsx`: an out-of-combat dive-end fires the return recap

## Scope (out)
- No change to the death recap, the Delve Log, or the best-haul toast; no engine change

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] an extract (out of combat) with loot toasts "🎒 Returned from {region}" + "banked 1,500 loot gp · 4 cleared"
- [x] `onDelveEnd` fires after the toast (record extract → best-haul wins); empty extract gated out; death test still green (reorder safe)
- [x] UI suite (339, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the death-recap branch already present.
