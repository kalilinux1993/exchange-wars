# Phase: Exchange Wars — Phase 20c: modal focus management for the help dialog (a11y) (Brick 315)

**Started:** 2026-06-13
**Hat:** Builder (accessibility — WCAG 2.4.3 / the dialog pattern; the a11y dimension after motion 20a + live-regions 20b)
**Goal:** The HelpOverlay (shown on EVERY first run + via `?`) is a modal scrim+panel with NO focus management
— no `role="dialog"`, no focus moved INTO it on open, no restore on close. A keyboard/screen-reader user gets
the modal but their focus stays on the inert background behind the scrim, and on close it isn't returned. Add
the standard dialog focus pattern: `role="dialog" aria-modal` + focus-in on open + restore on close.
**Done condition met:** yes — the help panel is a labelled `role="dialog" aria-modal="true"`, focus moves to
it on open (SR announces "How to Play dialog"), and the previously-focused element is restored on close; a
render test pins both move-in and restore; suite + e2e green; typecheck clean.

## Why this brick
Continues the productive a11y-by-dimension vein (motion 20a, status-messages 20b) — and modal focus management
is a classic, genuinely-missing piece here (no `useEffect`/ref in HelpOverlay at all). It matters most because
this is the FIRST screen a new player sees; a keyboard/SR user landing outside the open modal is disorienting.
Also verified an adjacent dimension SOUND in passing: focus VISIBILITY — the six `outline: none` inputs all
carry a `border-color: var(--gold)` replacement cue, buttons use Chromium's contrast-adaptive default ring, and
there's no global outline suppression, so no 2.4.7 defect (the real gap was here, not there).

## Design — the dialog focus pattern (move-in + restore + semantics)
- `HelpOverlay.tsx`: `panelRef` + `useEffect` that captures `document.activeElement` on mount, focuses the
  panel, and restores the captured element on unmount. The panel `<section>` gains `ref` + `tabIndex={-1}`
  (programmatically focusable) + `role="dialog" aria-modal="true" aria-label="How to Play"`. Escape-close
  (17u) already dismisses. Full Tab-TRAP (cycle within) is deferred as a follow-up — move-in + restore +
  dialog semantics is the high-value bulk.

## Scope (in)
- `packages/ui/src/components/HelpOverlay.tsx`: focus-in/restore effect + dialog semantics
- `packages/ui/test/app.test.tsx`: a test — focus moves into the dialog on open, restores to the trigger on close

## Scope (out)
- No full focus-trap (Tab can still reach the background — flagged as a follow-up; move-in + restore is the
  bulk); no change to other overlays/scrims (help is the primary modal); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] help panel is role="dialog" aria-modal; focus moves into it on open; restored to the prior element on close — pinned
- [ ] UI suite (+1) + e2e (14) green; typecheck clean; existing help tests (Escape-close, text) unaffected
- [ ] UI-only — no engine change, no redeploy

## Open questions
- Full Tab-trap within the dialog is deferred (move-in + restore + Escape-close covers the common keyboard path).
