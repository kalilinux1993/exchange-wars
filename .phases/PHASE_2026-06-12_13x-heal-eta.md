# Phase: Exchange Wars — Phase 13x: Rest Heal-ETA (Brick 154)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG; the rest-vs-embark-hurt decision, untouched loop)
**Goal:** Show how many ticks a wounded player needs to mend to full out of the field.
**Done condition:** the CharacterPanel hp line shows "≈N ticks to heal" when wounded and not on a dive; suite + e2e green. **MET.**

## Why this brick
Fresh, untouched loop: wounds carry between dives and mend only OUT of the field (+1 hp every `REST_REGEN_TICKS`=3). The UI showed the hp bar but no ETA — so "rest first or embark hurt?" was a blind decision. This makes the rest cost concrete (fast-forward this many ticks to heal), pairing with 13p's mid-dive push read and the embark "wounds persist" note.

## Design — pure ETA helper, shown only when it applies
- `healEta(hp, max, regenTicks)` (game.ts, pure): `(max − hp) × regenTicks`, or null when full (`hp >= max`). Mirrors the engine's regen exactly (sim.ts:195-200).
- CharacterPanel computes it only when `agent.hp !== undefined` (wounded — full hp deletes the field) AND `!agent.expedition` (regen pauses on a dive), and shows "≈N ticks to heal" on the hp line.

## Outcome
- `game.ts`: `healEta`.
- `CharacterPanel.tsx`: `restEta` (wounded + out-of-field gated) on the hp line.
- Tests (+2): `healEta` (ticks-to-full, null at/over full) + a CharacterPanel render (hp 40 wounded shows "ticks to heal"; absent hp = full shows none).

## Gates
- [x] heal ETA shows only when wounded out of the field, hidden at full hp (unit + render)
- [x] UI suite (277, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- A "rest to full" one-click that fast-forwards exactly `restEta` ticks.
