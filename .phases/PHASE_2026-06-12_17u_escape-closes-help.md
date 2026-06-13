# Phase: Exchange Wars — Phase 17u: Escape closes the help overlay (Brick 255)

**Started:** 2026-06-12
**Hat:** Builder (UX — the modal-close convention)
**Goal:** Pressing `Escape` (when not typing) closes the How-to-Play overlay — the universal "dismiss the
modal" key. Completes the contextual-Escape behavior (17s: Escape clears the filter when it's focused).
**Done condition:** `Escape` closes the open help overlay (and marks it seen via `closeHelp`); `Escape` in a
focused input still clears the filter (17s), unaffected; suite + e2e green.

## Why this brick
The help overlay closes on the scrim click, the "start trading" button, and `?` — but not `Escape`, which
every modal honors. Adding it is a one-line branch in the App keydown handler. It composes with 17s: when an
input is focused, the App handler yields (its input-guard returns early) so the input's own Escape (filter
clear) wins; when no input is focused, Escape closes the help. So Escape is contextually correct: clear the
field you're in, else dismiss the modal.

## Design — one Escape branch in the App keydown, calling closeHelp
- `App.tsx`: in the global keydown handler, after the input-guard and before `resolveShortcut`, add
  `if (e.key === 'Escape') { closeHelp(); return; }`. `closeHelp` sets `HELP_SEEN_KEY` + `setHelpOpen(false)`
  (idempotent when already closed), so Escape always does the right thing without reading `helpOpen` (no
  stale-closure on the once-bound listener).

## Scope (in)
- `App.tsx`: Escape → closeHelp in the keydown handler
- `app.test.tsx`: Escape closes the open help overlay

## Scope (out)
- No change to the filter Escape (17s — handled on the input, which the App guard exempts); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] Escape closes the open help overlay; input-focused Escape (filter clear 17s) still works (App guard exempts inputs)
- [x] UI suite (419, +1) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — calling `closeHelp` is idempotent, so the branch needn't read `helpOpen` (avoids a stale-closure read).
