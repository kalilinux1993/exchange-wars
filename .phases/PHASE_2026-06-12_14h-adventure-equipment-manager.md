# Phase: Exchange Wars — Phase 14h: Adventure-Tab Equipment Manager (USER REQUEST) (Brick 164)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — the equipment manager Jesse asked for, on the Adventure tab)
**Goal:** Put the inventory + equipment manager on the Adventure tab, with each item's +stats, level requirement, and whether it's an improvement over what's equipped.
**Done condition:** a GearManager on the Adventure tab listing owned gear with stats/req/upgrade-verdict + equip/unequip/equip-best; suite + e2e green. **MET.**

## Why this brick
Jesse (present): "Equipment manager + inventory also on the Adventure tab — explaining what +stats each item gives, its requirements, and whether it's an improvement over the item you currently have equipped." The equip system lived on the Exchange tab's Ledger (PlayerPanel, sell-focused); the Adventure tab — where you prep your adventurer — only had the CharacterPanel paperdoll (display, no actions). This brings full, RICHER gear management to where it belongs.

## Design — a new GearManager, reuse gearDelta
- `GearManager(agent, items, onCommand)` (new component, rendered in ExpeditionPanel's embark view right after CharacterPanel). For each owned equippable piece it spells out: the stats it grants (⚔+atk / 🛡+def, via the GEAR table), its requirement ("needs Attack N"), and the upgrade VERDICT vs what's worn (via `gearDelta` from 13h): "↑ +N atk" over the worn piece / "↓ -N" downgrade / "= no gain" sidegrade / "🔒 train Skill to N" if under-level / "✓ worn" if equipped. Equip / unequip / equip-best actions (all via onCommand — the player surface).
- Worn gear is listed first with its stats + an unequip button. Reads agent state for display; mutates only through commands (UI rule).
- The Exchange Ledger keeps its sell-focused inventory; the Adventure GearManager is the combat-side companion (both intentionally present, per the request).

## Outcome
- `GearManager.tsx` (new): the rich manager + a `statLabel` helper.
- `ExpeditionPanel.tsx`: render GearManager after CharacterPanel in the embark view.
- Tests (+3): stats+req+upgrade-verdict shown and equip fires; under-level → locked, weaker → downgrade; worn gear lists with unequip.

## Gates
- [x] gear stats + requirement + upgrade-vs-equipped verdict shown; equip/unequip fire (render tests)
- [x] UI suite (288, +3) + e2e (9) green; typecheck clean; Adventure tab equip flow intact
- [x] UI-only — no engine change (equip/unequip/equipBest commands already exist), no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Follow-ups
- A paperdoll-grid layout for the equipped section; sort owned gear by slot or by biggest upgrade.
