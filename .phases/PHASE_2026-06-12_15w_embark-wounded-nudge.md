# Phase: Exchange Wars — Phase 15w: "Rest Before You Dive" Wounded Nudge (Brick 205)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — embark honesty / soft-loss prevention)
**Goal:** Warn on the embark screen when you'd dive WOUNDED — the forecast assumes full hp, so embarking
hurt makes it silently optimistic; show "⚠ you're at {hp}/{max} hp — rest first?" with a one-tap rest-to-full,
so the plan you read matches the hp you go in with.
**Done condition:** When the player is below max hp out of a dive, the EmbarkPanel shows a wounded warning
(naming current/max hp) + a "rest to full (≈N ticks)" button that fast-forwards the heal; suite + e2e green.

## Why this brick
The embark forecast (`combatForecast`) is computed at `trainedMax` — FULL hp — because it's a plan for a
fresh dive. But you can embark straight out of a prior dive before regen finishes (the engine heals over
ticks only while NOT on expedition), carrying the wound in. Nothing on the embark screen says so, so the
"favored" verdict you read can be a lie the moment you're hurt. This is the same optimistic-forecast trap
the push-read fixed mid-dive (13p, reads at CURRENT hp) — but the EMBARK side never got the current-hp
honesty. A wounded nudge + the existing rest-to-full action (13y) closes it: rest, then the forecast holds.

## Design — reuse the rest infra (13x/13y), add an embark warning
- `EmbarkPanel.tsx`: take an `onRest?: (ticks: number) => void` prop (App already passes `fastForward` to
  the other rest sites). Detect wounded via `agent.hp` (engine DELETES `hp` at full, so a defined `hp` <
  `trainedMax` = wounded). Compute `healEta(hp, trainedMax, REST_REGEN_TICKS)`. When wounded, render a
  `.warn` line "⚠ you're at {hp}/{max} hp — you'll dive hurt (forecast assumes full hp)" + a "rest to full
  (≈N ticks)" chip calling `onRest(eta)`.
- `App.tsx`: pass `onRest={fastForward}` to `<EmbarkPanel>`.

## Scope (in)
- `EmbarkPanel.tsx`: wounded detection + warning + rest chip (reuses `healEta`, `REST_REGEN_TICKS`)
- `App.tsx`: thread `onRest`
- `app.test.tsx`: a wounded player sees the warning + a rest button that calls `onRest`

## Scope (out)
- The forecast still reads at full hp (it's the PLAN — the warning flags the gap rather than re-pegging
  the number to a hp you intend to heal away); no auto-rest-on-embark; no engine change

## Subsystems touched
- packages/ui/src/components/EmbarkPanel.tsx
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] a player below max hp (out of a dive) sees the "⚠ … hp — you'll dive hurt" warning naming hp/max
- [x] the "rest to full" chip calls `onRest` with a positive heal ETA; warning absent at full hp
- [x] UI suite (354, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses the established rest plumbing; wounded detection mirrors CharacterPanel's `restEta`.
