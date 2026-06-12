# Phase: Exchange Wars — Phase 13y: "Rest to Full" One-Click (Brick 155)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG; turn 13x's heal-ETA readout into an action)
**Goal:** One click fast-forwards exactly the heal ETA, mending to full.
**Done condition:** a "rest to full" button beside the heal ETA fast-forwards `restEta` ticks; suite + e2e green. **MET.**

## Why this brick
13x named the rest cost ("≈N ticks to heal"); this acts on it. Manually fast-forwarding with +1k/+10k overshoots; a one-click that advances EXACTLY the ETA is the natural completion — the "action on the signal" step after the readout (the 13o/13q "signal on the control" thread, now "control beside the signal").

## Design — thread a fast-forward callback (rest ≠ a player command)
- Resting is a UI time-advance (`runTicks`), not a player command, so it can't go through `onCommand`. App passes `onRest={fastForward}` → ExpeditionPanel → CharacterPanel (new optional prop at each).
- CharacterPanel's "rest to full" button (shown only with the ETA, i.e. wounded + out of field) calls `onRest(restEta)` — fast-forwards exactly enough to mend. Title notes the market advances too.

## Outcome
- `App.tsx`: `onRest={fastForward}` on ExpeditionPanel.
- `ExpeditionPanel.tsx`: `onRest?` prop, passed to CharacterPanel.
- `CharacterPanel.tsx`: `onRest?` prop + the "rest to full" button beside the heal ETA.
- Tests (+1): clicking "rest to full" calls `onRest` once with a positive ETA.

## Gates
- [x] "rest to full" fires onRest with the ETA, only when wounded+out-of-field (render test)
- [x] UI suite (278, +1) + e2e (9) green; typecheck clean (onRest typed `| undefined` for exactOptionalPropertyTypes through-passing)
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- Could disable/hide the button while the world is auto-playing (it still works, just redundant).
