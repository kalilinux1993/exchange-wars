# Phase: Exchange Wars — Phase 21h: teach the session's new decision tools in the Help overlay (Brick 326)

**Started:** 2026-06-13
**Hat:** Builder (onboarding/docs — discoverability; pivot off the two deed bricks)
**Goal:** This session added powerful, contextually-visible tools the Help overlay (the learn-the-game surface)
never mentions — and the social bullet even references challenge links "by handle" without ever telling the
player they can SET their name (the 21b gap). Pair the new tools with their docs, as the 18d refresh did.
**Done condition met:** yes — concise clauses fold into existing Help bullets covering: set your handle (21b),
take-profit/cut one-clicks on positions (21d/14s), the upgrade afford-ETA / sell-to-afford (21a), the
abort-stale dead-capital action (21e), and the outgrown-farm push-deeper nudge (21c); the help-content test
gains substring assertions pinning each against future drift; suite + e2e green; typecheck clean.

## Design
- One-clause additions into the EXISTING bullets (not new bullets) to avoid bloating an already-dense guide —
  the same surgical approach as 18d. textContent-substring assertions in the existing help test pin them.

## Scope (in)
- packages/ui/src/components/HelpOverlay.tsx (5 concise clause additions)
- packages/ui/test/app.test.tsx (extend the help-content test with the new substrings)

## Scope (out — explicit non-goals)
- New bullets / restructuring the guide; documenting the new DEEDS (the MilestonesPanel speaks for itself)
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] help mentions: set your handle · ✓ take/✂ cut · sell goods to afford it now · abort stale · outgrown
- [x] help-content test asserts each new substring; existing help tests unbroken
- [x] typecheck clean; UI suite 508 (extended help test, no new count); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- If the guide feels long, a future pass could split it into tabs — out of scope here.
