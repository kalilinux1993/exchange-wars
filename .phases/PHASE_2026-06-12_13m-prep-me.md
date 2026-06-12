# Phase: Exchange Wars — Phase 13m: One-Tap "Prep Me" (Brick 143)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — RPG/embark; pivot off the trading vein for breadth)
**Goal:** One button packs the fix for EVERY embark warning at once.
**Done condition:** a "prep me" button on the embark screen that packs one of each distinct fix item when ≥2 warnings have owned fixes; UI suite + e2e green. **MET.**

## Why this brick
Pivoted off the trading branch (NEXT_STEPS: rotate systems for breadth). 12q gave each readiness warning its own one-click "+ pack" chip; the queued follow-up was a single button that clears them ALL. On a fiery + hard region a fresh fighter sees two warnings (antifire + food) and had to fix each separately — "prep me" does both in one tap.

## Design — reuse the existing fix resolution, dedupe, pack one each
- The warning→fix machinery already exists (`embarkPrep` + `fixFor(kind)` finding an owned consumable). "prep me" collects the DISTINCT fix items across all warnings (`new Set`) — a fire-region food shortfall can be cleared by the same super-antifire that fixes the burn, so dedupe means the button earns its place only with **2+ distinct items** (a single fix already has its own chip).
- One `setDraft` packs `min(current+1, owned)` of each fix — same clamp as the per-warning chip, applied atomically.

## Outcome
- `ExpeditionPanel.tsx`: compute `fixes` (deduped owned fixes for the active warnings); render a "⚑ prep me" button when `fixes.length >= 2`.
- Tests (+1): on dragons_maw (fiery + risky for a fresh fighter) with an owned antifire AND food, both warnings show; one "prep me" tap clears both. (The test also pins that dragons_maw reads as a risky forecast for a fresh fighter, so the food warning fires.)

## Gates
- [x] "prep me" appears only with ≥2 distinct fixes; one tap clears all warnings (render test)
- [x] UI suite (257, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- "prep me" could also top up food to a depth (e.g. enough for the forecast's rounds-to-fall) rather than one unit.
- Trading gaps still open: highlight underwater positions; a per-flip round-trip trade journal.
