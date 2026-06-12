# Phase: Exchange Wars — Phase 15b: Deep-Link the Onboarding Steps (Brick 184)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — onboarding / readout→action)
**Goal:** Turn the static "Getting Started" steps (11v) into navigation — click an unfinished
step to jump to the tab where you'd do it.
**Done condition:** Each `firstSteps` entry that maps to a room (trade→Exchange, clerk→Hall,
delve→Adventure) renders as a button that calls `onGo(room)` when unfinished; done/no-target
steps stay static; suite + e2e green.

## Why this brick
The onboarding checklist (11v) NAMES the four fundamentals but a new player still has to find
the right tab to act. Making each step a link closes that gap — the readout→action pattern (14s
cut-losers, 14z click-to-buy) applied to onboarding: tell the player what to do AND take them
there. (Note: a near-duplicate `FirstSteps` checklist was scoped this turn before discovering 11v
already shipped it — grep-before-build; this brick enhances the existing one instead of replacing it.)

## Design — a per-step target + a nav callback
- `FirstStep` gains `goto?: 'exchange' | 'adventure' | 'hall'`. `firstSteps` tags the three
  actionable steps (the "reach tick N" gate has no target — it's just time).
- `FirstSteps` takes an optional `onGo(room)`; an UNFINISHED step with a `goto` renders its label
  as a button calling `onGo(s.goto)`; finished or target-less steps stay plain text.
- App passes `onGo={pickRoom}` (the same room-switch the tabs use) — zero new navigation logic.

## Scope (in)
- `FirstSteps.tsx`: `goto` on the steps + `onGo` prop + clickable unfinished steps
- `App.tsx`: pass `onGo={pickRoom}` to `<FirstSteps>`
- `styles.css`: `.linkstep` affordance
- `app.test.tsx`: an unfinished step with a target calls `onGo`; a finished one doesn't link

## Scope (out)
- No change to the steps' done-logic or which four they are; no auto-action (it navigates, the
  player still does the thing); no engine change

## Subsystems touched
- packages/ui/src/components/FirstSteps.tsx
- packages/ui/src/App.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] an unfinished step with `goto` is a button → `onGo('exchange')`; a finished step is plain text
- [x] UI suite (323, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `pickRoom` + the existing checklist.
