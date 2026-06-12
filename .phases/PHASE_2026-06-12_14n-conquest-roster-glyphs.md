# Phase: Exchange Wars — Phase 14n: Conquest Roster Glyphs (Brick 170)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — conquest/completion subsystem)
**Goal:** Turn each Region Conquest row's abstract "slain/total" into the concrete
foes — a strip of monster glyphs, lit once you've slain that foe, dim until then —
so "which foe is left here?" is answerable at a glance.
**Done condition:** Each ConquestPanel region row shows its native roster as lit/dim
`MonsterGlyph`s (lit = killed ≥1, dim = unmet), with a per-foe tooltip; suite + e2e green.
**MET.**

## Why this brick
The conquest codex (12f) tells you 3/5 of a region is mastered but not WHICH 2 foes
remain — so to finish a region you have to cross-reference the flat Bestiary. The
per-region roster strip names the gap visually: the dim glyphs are exactly the foes
left to hunt. NEXT_STEPS lists this ("per-region roster glyphs (lit/dim) for
which-foe-is-left"). Branches into the conquest subsystem for variety after a long
equipment arc.

## Design — lit/dim glyph strip per region row
- ConquestPanel: each `<li.conquest-row>` becomes a column: the existing header line
  (name · bar · N/M) wrapped in `.conquest-head`, plus a new `.conquest-roster` strip.
- The strip maps `regionRoster(region)` (already deduped, order-stable, elite last) to
  small `MonsterGlyph`s. Class `slain` (full) when `killsByMonster[id] > 0`, else
  `unmet` (grayscale + low opacity). Per-glyph `title`: "Name — slain ×N" / "Name — not
  yet slain". Strip is `aria-hidden` (decorative); the N/M text is the SR summary, as the
  conquest bar already is.
- Reuses `MonsterGlyph` (the deterministic per-id portrait shared with combat/bestiary)
  and `regionRoster`/`regionMastery` — no new computation, no engine change.

## Scope (in)
- ConquestPanel.tsx restructure + glyph strip
- styles.css: `.conquest-row` → column, `.conquest-head`, `.conquest-roster`, `.roster-foe`
- app.test.tsx: a test asserting lit/dim counts match kills

## Scope (out)
- No engine change, no new mastery threshold (still: 1 kill = slain)
- No click-to-reraid from a glyph (RegionMap already does region selection)
- No Bestiary changes (it stays the flat all-foes reference)

## Subsystems touched
- packages/ui/src/components/ConquestPanel.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] Render test: a region with K of N roster slain shows K `.roster-foe.slain` + (N−K) `.roster-foe.unmet` (K=1)
- [x] UI suite (292, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Outcome
- `ConquestPanel.tsx`: each row is now a `.conquest-head` (name · bar · N/M) over a
  `.conquest-roster` strip of `MonsterGlyph`s (`slain`/`unmet`), reusing `regionRoster`
  + `killsByMonster` + the deterministic per-id portrait.
- `styles.css`: `.conquest-row` → column; `.conquest-head` flex; `.conquest-roster` wrap;
  `.roster-foe.unmet` grayscale + 0.22 opacity.
- Test (+1): one slain foe lights exactly one glyph, dims the rest, total == deduped roster.

## Open questions
- None — pure UI composition over existing data.
