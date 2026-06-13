# Phase: Exchange Wars — Phase 18u: `r` flees (complete the combat keyboard verbs) (Brick 281)

**Started:** 2026-06-13
**Hat:** Builder (input/UX — finish keyboard-playable combat)
**Goal:** 18q gave combat `f`=fight but left flee mouse-only — so combat was half keyboard-playable (you can
swing but not retreat from the keyboard). Add `r`=flee to the same gated listener, completing the two combat
verbs on the keyboard (eat stays a click — food choice is too consequential for a single key).
**Done condition met:** yes — `r` issues `fleeCombat` on the Adventure tab in an active fight, gated like
`f` (off-tab/out-of-combat/typing → no-op); help documents it; suite + e2e green.

## Why this brick
The keyboard-playability arc was complete everywhere except the second combat verb: `f` swings (18q) but to
flee you had to mouse the button — so "drive combat from the keyboard" was still incomplete. `r` (retreat) is
the natural, unused key; adding it to the existing combat keydown (one more branch, same active/in-combat/
not-typing gate + refs-fresh) finishes the pair. Eat stays deliberate (multiple foods, wasting a brew on a
mis-press is a real footgun); fight/flee are the two navigation verbs and both are non-catastrophic
(flee is a 60% attempt costing at most a round), so both belong on the keyboard.

## Design — one more branch on the 18q listener
- `ExpeditionPanel.tsx`: in the combat keydown (added 18q), `e.key === 'r'|'R'` → `onCommand({ type:
  'fleeCombat' })`, alongside the existing `f`→fight. Same gating/refs.
- `HelpOverlay.tsx`: "…in a fight, f swings and r flees."

## Scope (in)
- `packages/ui/src/components/ExpeditionPanel.tsx`: the `r`-flee branch
- `packages/ui/src/components/HelpOverlay.tsx`: document `r`
- `packages/ui/test/app.test.tsx`: extend the 18q combat-hotkey test — `r` flees; off-tab ignores both

## Scope (out)
- No eat hotkey (ambiguous/footgun-y across multiple foods); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `r` (Adventure, in combat) → `fleeCombat`; off-tab → no-op; help documents f swings + r flees — render test
- [x] UI suite (451) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors 18q's `f` exactly (same listener/gate), completing the combat verb pair.
