# Phase: Exchange Wars — Phase 13h: Gear Upgrade Delta (Brick 138)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — serve the user's ORIGINAL pain: "trying to buy upgrade gear")
**Goal:** Each satchel gear stack shows whether it's an upgrade over what you currently wear, on the governing stat.
**Done condition:** a `gearDelta` pure helper + a delta badge on every gear stack in PlayerPanel (⚔+N / 🛡+N green upgrade, red downgrade, 🔒 req when under-level, "no gain" sidegrade); UI suite + e2e green. **MET.**

## Why this brick
The user's first report in this arc was about buying upgrade gear ("trying to buy upgrade gear, and then the clerk sells it…"). 13d/13e/13f/13g made gear safe, equippable, auto-equippable, and the character sheet truthful — but the BUY decision was still blind: the satchel showed an "equip" chip with no signal whether the piece actually beats what you wear. This closes that loop: the upgrade value is legible at the point of decision.

## Design — a pure helper, levels read for display
- `gearDelta(itemId, worn, lvls)` (game.ts): governing-stat change vs the worn piece in that slot (weapon→Attack, armor→Defence). Empty slot → full stat is the gain. Returns `{slot, delta, offDelta, usable, req, skill, vs}` or null for non-gear. Pure → unit-tested.
- PlayerPanel derives the player's levels from `game` (display-only `WorldState` read, allowed by the UI rule — the view doesn't carry levels) and renders a badge per gear stack: `⚔+N`/`🛡+N` (green `.up`) for an upgrade, red `.down` for a downgrade, amber `🔒 Atk/Def req` when under-level, dim "no gain" for a sidegrade. Colour reuses the existing `.up`/`.down` semantics (green=good/red=bad) from the danger readout.
- New `.delta` CSS (compact, tabular-nums); `.delta.lock` amber.

## Outcome
- `game.ts`: `gearDelta` + `GearDelta` interface (imports GEAR/GearSlot).
- `PlayerPanel.tsx`: per-stack delta badge before the equip button; levels from `game`.
- `styles.css`: `.delta` / `.delta.lock`.
- Tests (+7): `gearDelta` (empty-slot full gain, upgrade-over-worn, downgrade, under-level unusable, armor uses Defence, null for non-gear) + a PlayerPanel render (worn adamant dart, satchel rune 2h → shows `⚔+35`).

## Gates
- [x] gearDelta pure + correct across upgrade/downgrade/sidegrade/unusable/non-gear (6 unit tests)
- [x] badge renders the delta in PlayerPanel (render test)
- [x] UI suite (243, +7) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- A richer paperdoll GRID (per-item silhouettes in slot layout).
- The same delta could annotate the upgrade-shop / buy ticket (so you see upgrade value BEFORE you buy, not just after it's in the satchel).
- Decide if deep-region death should risk worn gear (currently always safe).
