# Phase: Exchange Wars — Phase 21o: complete the Help-dialog Tab focus-trap (WCAG 2.4.3) (Brick 333)

**Started:** 2026-06-13
**Hat:** Builder (a11y — finish the modal-focus work 20c explicitly deferred)
**Goal:** 20c moved focus INTO the help dialog on open + RESTORES it on close, but explicitly deferred the
full Tab-TRAP — so a keyboard user can still Tab OUT of the modal to the inert background behind the scrim
(confusing: you're "in" a modal but Tab takes you out). Trap Tab within the dialog.
**Done condition met:** yes — an `onKeyDown` on the dialog `<section>` intercepts Tab: from the panel it
enters the focusables, and at either boundary (or the single focusable) it wraps, so focus never escapes to
the background; a test pins Tab/Shift+Tab keeping focus inside; existing 20c focus-in/restore unchanged.

## Design
- onKeyDown on the role=dialog section (catches descendant keydowns via bubbling): compute focusables
  (`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`); if focus is on the panel
  (moved-in on open, tabIndex -1) Tab → first/last; at last → first (Shift+Tab at first → last). With the
  help dialog's single focusable ("start trading"), Tab wraps to itself — focus can't reach the background.
- Purely additive to 20c's move-in + restore useEffect; Escape-dismiss (17u) is a different key, no conflict.

## Scope (in)
- packages/ui/src/components/HelpOverlay.tsx (onKeyDown trap + the comment update)
- packages/ui/test/app.test.tsx (Tab/Shift+Tab stays within the dialog)

## Scope (out — explicit non-goals)
- No restructuring of the guide; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] Tab from the panel enters the focusable; Tab/Shift+Tab at the boundary wraps inside (never the background)
- [x] 20c focus-in-on-open + restore-on-close still hold (their test unchanged + passing)
- [x] typecheck clean; UI suite 519 (+1); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- None — this closes the flagged 20c remainder; the help-dialog now fully matches the WCAG dialog pattern.
