# Phase: Exchange Wars — Phase 13j: Gear Findability on the Market (Brick 140)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — make gear findable so the buy-gear flow is actually usable)
**Goal:** Gear is visually distinct on the market table and isolable with a one-click track filter.
**Done condition:** a ⚔/🛡 marker on every gear row + a "gear" track filter (shows only equippable items); UI suite + e2e green. **MET.**

## Why this brick
13i previews a gear buy's upgrade value at the ticket — but you can only buy what you can FIND, and gear is buried among 128 commodities with no marker or filter. The existing track chips (all/staples/exotics) split by volatility, which doesn't help you locate the ~19 equippable items. This closes the findability gap that the rest of the buy-gear arc depended on.

## Design — one new track + a per-row marker, reuse GEAR
- `MarketTable` imports `GEAR`. `inTrack` gains a `gear` case (`GEAR[id] !== undefined`); the track-chip array gains `'gear'`.
- Each gear row shows a ⚔ (weapon) / 🛡 (armor) marker after the name, titled with the slot + level req — so gear is spottable even in the "all" view, and the marker doubles as the "what does it need?" hint.
- New `.gearmark` CSS (gold, small, help cursor) — sits beside the existing ⚡ event-mark / ◆ mine markers.

## Outcome
- `MarketTable.tsx`: GEAR import; `gear` track + chip; per-row ⚔/🛡 marker.
- `styles.css`: `.gearmark`.
- Tests (+1): the "gear" track filters to a strict subset, all rows then carry a marker, and gear rows are marked in the "all" view.

## Gates
- [x] gear rows marked; "gear" track isolates the equippable subset (render test)
- [x] UI suite (246, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- A richer paperdoll GRID (per-item silhouettes in slot layout).
- The "gear" track could sub-group by slot, or sort by upgrade delta vs what's worn (surface the best buy first).
- Decide if deep-region death should risk worn gear (currently always safe).
