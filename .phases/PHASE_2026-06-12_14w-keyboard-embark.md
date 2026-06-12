# Phase: Exchange Wars — Phase 14w: Keyboard Embark Navigation (Brick 179)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — input / keyboard accessibility)
**Goal:** Make the adventure embark flow keyboard-drivable — ←/→ to move the selected
region, Enter to embark — gated to the active Adventure tab, so the whole game (trade loop
+ adventure) is reachable without the mouse.
**Done condition:** With the Adventure tab active and no dive in progress, ←/→ cycle the
selected region among the unlocked ones and Enter embarks; keys are ignored when the tab is
inactive or you're typing; suite + e2e green.

## Why this brick
NEXT_STEPS notes the TRADE loop is keyboard-driven end to end (j/k pick → b/s side → Enter
submit), but the ADVENTURE embark is mouse-only (click a map node, click EMBARK). Extending
the same control to the embark closes that gap. Fresh subsystem (input/UX) untouched this
session; mirrors the proven 12g MarketTable `active`-gated window listener.

## Design — active-gated window keydown, reuse the embark path
- EmbarkPanel gains an optional `active` prop (App passes `room === 'adventure'`). A
  `useEffect` window `keydown` listener (placed BEFORE the in-dive early return, per the hooks
  rule) handles keys only when `active && !agent.expedition` and the event target isn't an
  INPUT/TEXTAREA/SELECT (don't hijack typing).
  - ←/→: move the selected region index within `[0, progress]` (clamped — can't select a
    locked region), `preventDefault` to stop page scroll.
  - Enter: embark via the SAME `doEmbark()` the EMBARK button calls (built from `draft`),
    guarded by the same locked check; `preventDefault`.
- `doEmbark()` is extracted from the button's inline onClick so the button and Enter can never
  diverge (one embark path, two triggers — the single-source discipline).

## Scope (in)
- `EmbarkPanel.tsx`: `active` prop + the keydown effect + extracted `doEmbark`
- `App.tsx`: pass `active={room === 'adventure'}` to EmbarkPanel
- `app.test.tsx`: ←/→ moves the region (flavor text changes); Enter embarks; inactive/typing ignored

## Scope (out)
- No digit quick-select (the 1/2/3 room-key collision noted in NEXT_STEPS stays deferred)
- No engine change; no change to the click/mouse embark path (it reuses the same `doEmbark`)

## Subsystems touched
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] ←/→ cycles the selected region (flavor text changes); Enter embarks via `doEmbark` (startExpedition)
- [x] inactive tab → keys ignored (typing-guard via target tagName)
- [x] UI suite (313, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Listener re-subscribes on draft/region change (cheap add/removeEventListener) — acceptable,
  same as the 12g pattern.
