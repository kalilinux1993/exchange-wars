# Phase: Exchange Wars — Phase 16z: Apex Predator — the elite capstone (Brick 234)

**Started:** 2026-06-12
**Hat:** Builder (progression — a collective trophy for the four elites)
**Goal:** Complete the 16w elite arc with (1) an "Apex Predator" deed earned by felling all FOUR distinct
named elites, and (2) an "Elite Hunt N/4" tracker in the ConquestPanel collecting the bosses (scattered
one-per-deep-region) into one visible progress surface.
**Done condition:** The deed achieves only with all four elites in `killsByMonster`; the ConquestPanel shows
a gold-bordered "☠ Named Elites N/4" strip lighting felled elites; suite + e2e green.

## Why this brick
16w salutes each elite's FIRST kill; there was no collective goal or progress surface for the set. The four
elites (Skarn/Vorkanth/Zukrath/Vessith) live one per deep region, so the conquest rosters show each in
isolation — you can't see "how many of the four have I felled?" at a glance. A capstone deed gives the
long-game elite hunter a named trophy (deeper than elder-slayer's "any one elite"); the tracker collects the
scattered bosses into one featured row, with the MilestonesPanel deed-bar showing partial progress for free.

## Design — a capstone deed + a collected tracker, both off ELITES
- `game.ts`: `apex-predator` MILESTONE — `ELITES.every(e => killsByMonster[e.id] > 0)` (+ a `progress`
  fraction), mirroring monster-scholar/realm-conquered. `ELITES` (16w) is the single elite roster source.
- `ConquestPanel.tsx`: an `.elitehunt` strip above the region rows — `☠ Named Elites`, a conquest-style
  bar, `felled/4`, and the four elite glyphs (lit/dim via `roster-foe slain/unmet`). Distinct `.elitehunt`
  class (NOT `.conquest-row`, so the existing region-row `querySelectorAll('.conquest-row')[0]` tests hold).
- `styles.css`: a small `.elitehunt` rule (gold border, teal on done) reusing the conquest inner classes.

## Scope (in)
- `game.ts`: `apex-predator` milestone
- `ConquestPanel.tsx`: the Elite Hunt strip (+ ELITES import)
- `styles.css`: `.elitehunt` / `.elitehunt.done`
- `app.test.tsx`: deed unit (4 distinct required, partial progress) + ConquestPanel tracker render

## Scope (out)
- No engine change (reads existing `killsByMonster`) — no redeploy
- No change to elder-slayer or the per-region conquest rosters

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/ConquestPanel.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] `apex-predator` achieves only with all four elites; progress = felled/4 (+ latches via checkMilestones)
- [x] ConquestPanel shows the `.elitehunt` strip with correct N/4 + lit/dim glyphs; region-row tests unbroken (`.conquest-row` count == regions)
- [x] UI suite (395, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors realm-conquered (deed) + the conquest roster strip (tracker) exactly.
