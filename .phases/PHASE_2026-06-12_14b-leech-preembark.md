# Phase: Exchange Wars — Phase 14b: Pre-Embark Leech Warning (Brick 158)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — embark; surface the leech threat BEFORE you commit)
**Goal:** The region danger read flags a loot-draining (leech) region pre-embark.
**Done condition:** `regionDanger` reports the region's worst leech; the embark danger line shows "💧 drains loot" for the Abyss; suite + e2e green. **MET.**

## Why this brick
14a warned about leech DURING a fight; this surfaces it at the EMBARK decision, where you can still act on it (bring more damage, plan to extract early, or skip). A gp-race region you learn about mid-dive is one you've already half-lost.

## Design — extend regionDanger, show beside the existing danger read
- `regionDanger` gains a `leech` field — the max per-round drain among the region's foes (0 = none; only the Abyss bites).
- The embark danger line ("danger: foes up to ⚔X 🛡Y · N hp") appends "💧 drains loot" (red) when `d.leech > 0`, titled to explain the gp-race and the response (damage + extract). Completes the leech surfacing: pre-embark (14b) + in-fight (14a).

## Outcome
- `ExpeditionPanel.tsx`: `leech` on `regionDanger`; the warning on the embark danger read.
- Tests (+1, +1 updated): `regionDanger(abyss).leech > 0`, `regionDanger(plains).leech === 0`; the existing strict `toEqual` updated for the new field.

## Gates
- [x] regionDanger reports leech; embark read shows the warning for the Abyss (unit tests)
- [x] UI suite (281, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- None — leech is now surfaced both pre-embark and in-fight.
