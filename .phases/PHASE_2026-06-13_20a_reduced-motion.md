# Phase: Exchange Wars — Phase 20a: honor prefers-reduced-motion globally (a11y; the looping animations were un-guarded) (Brick 313)

**Started:** 2026-06-13
**Hat:** Builder (accessibility — WCAG 2.3.3; complete the partial reduced-motion support, drift-proof)
**Goal:** `prefers-reduced-motion` is only PARTIALLY honored — 3 enumerated blocks cover 4 of 29 animations,
and the LOOPING (infinite) ones — the vestibular triggers — slipped through: `.event-chip.ending` (event
pulse), `.combatscene .monster` (bob), and `.combatscene .elite-aura` (my 19s pulse, added with no guard). A
user who sets reduced-motion still gets continuous motion. Add the standard drift-proof global block that
reduces ALL motion to imperceptible, so current AND future animations are covered.
**Done condition met:** yes — a global `@media (prefers-reduced-motion: reduce)` block sets
`animation-duration`/`animation-iteration-count`/`transition-duration` to near-zero on `*` (the recommended
pattern); the looping aura/bob/event-pulse settle to their rest state (their loops are symmetric 0%==100%);
hit-splats vanish but their damage is ALSO in the combat log (no unique info lost); an e2e under emulated
reduced-motion verifies it; suite + e2e green; typecheck clean.

## Why this brick
Genuine, real a11y defect (continuous motion under reduced-motion = the exact WCAG 2.3.3 vestibular concern),
partly introduced by me (the 19s elite-aura looped with no guard). The enumerated approach DRIFTED — every new
infinite animation since the blocks were written was missed; the global pattern is drift-proof (covers future
animations too). Safe because the loops here are symmetric (settle to rest when flash-completed) and the only
one-shot whose info matters (hit-splats) is redundant with the combat log. UI/CSS-only.

## Design — the standard global reduced-motion block
- `styles.css` (append): `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:
  0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important;
  scroll-behavior: auto !important } }`. Supersedes/supplements the 3 enumerated blocks (left in place —
  `animation: none` there fully disables those 4; harmless overlap). The `!important` + `*` make it
  authoritative and future-proof.
- `e2e/game.spec.ts`: a test that `emulateMedia({ reducedMotion: 'reduce' })` then asserts a computed
  `animation-duration` of `0.01ms` (the global rule is active).

## Scope (in)
- `packages/ui/src/styles.css`: the global reduced-motion block
- `packages/ui/e2e/game.spec.ts`: an emulated-reduced-motion behavior test

## Scope (out)
- No removal of the 3 existing enumerated blocks (harmless, lower-risk to leave); no special-casing splats
  (redundant with the combat log); no JS/engine change → no redeploy

## Subsystems touched
- packages/ui/src/styles.css
- packages/ui/e2e/game.spec.ts

## Gates
- [ ] global reduced-motion block reduces all animations (incl. the 3 un-guarded loops + future) to imperceptible
- [ ] e2e under emulated reduced-motion sees animation-duration 0.01ms; normal e2e (13) + suite green; typecheck clean
- [ ] UI/CSS-only — no engine change, no redeploy

## Open questions
- None — the loops are symmetric (settle to rest) and splats are redundant with the log; the global pattern is the WCAG-recommended one.
