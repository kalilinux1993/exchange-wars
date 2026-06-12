# Phase: Exchange Wars — Phase 14m: Move "Plan a Dive" to the Right Column (Brick 169)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — layout/extraction, user-directed)
**Goal:** Move the embark loadout-packer ("Pack & Equip" + EMBARK) off the tall left
column into the empty right-hand side of the Adventure tab, where Jesse pointed.
**Done condition:** A standalone `EmbarkPanel` ("Plan a Dive") renders in the Adventure
tab's right column; the left column (Expeditions/adventurer status) no longer carries the
embark flow; suite + e2e green. **MET.**

## Why this brick
Jesse (screenshots): "this is currently at the bottom of the adventurer tab, I think it
should be on this right hand empty side instead" — pointing at the **PACK & EQUIP** /
EMBARK block. It lived at the bottom of the single tall left `ExpeditionPanel`, pushing the
adventurer status far down while the right side sat empty. Splitting the embark flow into its
own panel on the right balances the tab and pairs "Plan a Dive" (right) with "Expeditions"
(left).

## Design — extract the embark flow into its own panel
- New `EmbarkPanel.tsx` owns the embark surface: region/draft/loadout state, the `regionPick`
  pulse effect, RegionMap, danger + forecast readouts, Pack & Equip header, "⚔ equip best",
  saved loadouts, the relevant-items packer (+/-), and the EMBARK button. Returns `null` while
  on a dive (you can't embark from the field) — same guard the old inline block had.
- `ExpeditionPanel.tsx` loses the embark JSX, its embark state/effects, the `regionPick` prop,
  and (this brick) four now-dead imports (`useState`, `usePref`, `embarkPrep`, `RegionMap`).
  It keeps `regionDanger` (still exported and imported by EmbarkPanel) and the 14l worn fixes.
- `App.tsx` Adventure tab: left `.middle.wide` = ExpeditionPanel (regionPick prop dropped);
  right `.middle` = `<EmbarkPanel … regionPick={regionPick} />` above BountyBoard / Deeds.
- Pure move: the engine, commands, and `deriveStats(view.inventory, lvls, agent?.worn)` calls
  are byte-identical to the inline versions — only the JSX's home changed.

## Outcome
- New `EmbarkPanel.tsx` (the extracted flow, ~265 lines).
- `ExpeditionPanel.tsx`: embark block + state + dead imports removed; `!exp` branch ends at the
  Bestiary.
- `App.tsx`: EmbarkPanel wired into the Adventure right column; ExpeditionPanel's `regionPick`
  prop removed.
- Tests: 5 embark tests re-scoped `.expedition` → `.embark` (controls moved panels), keeping
  `.expedition` for Bestiary/skills/character. (Test learning: a selector that asserts WHICH
  panel owns a control is load-bearing during an extraction — moving JSX between panels breaks
  exactly those selectors, which is the suite proving the move happened, not friction.)

## Gates
- [x] EmbarkPanel renders the embark flow in the right column; e2e "embark fists-first" still
      green against the extracted panel
- [x] UI suite (291) + e2e (9, +1 on-demand skipped) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays
      12b + 13d + 13e + 13f + 13r + 14j)

## Follow-ups
- None for the layout. (Latent housekeeping noticed: 14k/14l shipped without FINDINGS entries —
  not reopened here to keep this brick's scope to the layout move.)
