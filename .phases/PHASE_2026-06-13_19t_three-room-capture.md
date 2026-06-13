# Phase: Exchange Wars — Phase 19t: capture all three rooms (visual-QA tooling + README) (Brick 306)

**Started:** 2026-06-13
**Hat:** Scribe/QA (extend the QA instrument to cover what we ship; richer README)
**Goal:** The on-demand screenshot capture only shot the Exchange (the README hero). Adventure and the Hall —
half the game, and where ~10 of this session's features landed — were never captured, so their layout was
QA'd blind. Extend the capture to all three rooms and add the new shots to the README.
**Done condition met:** yes — the SCREENSHOT capture navigates Exchange → Adventure → Hall, waits for a stable
element in each, and writes `docs/screenshot{,-adventure,-hall}.png`; the README shows all three; a visual-QA
pass confirms Adventure + Hall are healthy (fresh-state sparseness is expected empty-state, not a bug); gates green.

## Why this brick
I added a survivability ladder, lethality warning, elite aura, and Hall rebalance this session while only ever
seeing the Exchange rendered — a QA blind spot. A one-time capture extension closes it cheaply, and the RPG +
meta halves were invisible in the single hero shot (marketing value). The pass found the rooms sound.

## Scope (in)
- `packages/ui/e2e/game.spec.ts`: capture Adventure + Hall in the on-demand screenshot test
- `README.md`: add the two new room shots
- `docs/screenshot{,-adventure,-hall}.png`: the captured assets

## Scope (out)
- No layout change (the fresh-state voids are empty-state, fill with play — not the 18t structural void); no
  engine change → no redeploy

## Subsystems touched
- packages/ui/e2e/game.spec.ts · README.md · docs/*.png

## Gates
- [x] capture writes all three room PNGs; README references them
- [x] typecheck clean; e2e 13 (capture skipped without SCREENSHOT); unit unchanged (480)
- [x] visual-QA: Adventure + Hall healthy (fresh-state sparseness noted, not a bug)
- [x] e2e/docs only — no engine change, no redeploy

## Open questions
- None — recon confirmed the rooms are sound; fresh-state sparseness fills with play.
