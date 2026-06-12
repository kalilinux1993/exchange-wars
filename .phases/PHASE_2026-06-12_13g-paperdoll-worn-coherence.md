# Phase: Exchange Wars — Phase 13g: Paperdoll ↔ Worn Coherence (Brick 137)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI bug fix — make the Adventure-tab character sheet truthful after 13e/13f)
**Goal:** The Adventure-tab paperdoll + "in battle" effective stats must reflect ACTUAL equipped (`worn`) gear, not a satchel-derived preview.
**Done condition:** `equipped()` and `deriveStats()` in CharacterPanel factor in `agent.worn`; figure/effstats agree with the equipment manager and the combat math; tests pin the override; full UI + e2e green. **MET.**

## Why this brick
13e added persistent `worn` equipment; 13f added one-click `equipBest`. But the CharacterPanel (Adventure tab) still computed its paperdoll from `equipped(inventory, lvls)` — a PREVIEW of "best gear you could pack", ignoring `worn` entirely. Two concrete bugs this caused:
1. Equip your best weapon via the manager → it leaves `inventory` for `worn` → the paperdoll's weapon slot shows the next-best satchel weapon (a DOWNGRADE) or empty, right after you equipped your best. The two equipment surfaces (Adventure paperdoll vs Exchange "Equipped" list) disagreed.
2. The "in battle: ⚔X 🛡Y" line called `deriveStats(inventory, lvls)` with no `worn`, so your effective stats ignored everything you'd equipped.

This is the same coherence debt the user originally flagged ("the inventory/equipment never seems right"), now in the character sheet.

## Design — mirror the engine's deriveStats override, no new data plumbing
- CharacterPanel already receives the whole `agent`, so `agent.worn` was already in hand — no prop threading.
- `equipped(inv, lvls, worn?)`: after the best-from-inventory scan, a `worn` override loop (identical rule to `deriveStats`: usable worn piece wins its slot). With `worn` absent → byte-identical to before.
- `kit = equipped(inv, lvls, agent.worn)`; `eff = deriveStats(inv, lvls, agent.worn)`. `lockedUpgrades` unchanged — it just receives the now-correct `kit`.
- Truthful-over-flattering: if you've equipped a WORSE piece than you hold, the figure shows the worse (worn) piece — because that's what fights. `equipBest`/equip fix it in one click.

## Outcome
- `CharacterPanel.tsx`: `equipped()` gains the `worn` override; lines 92-93 pass `agent?.worn`.
- Tests (+4): `equipped` override (worse-worn-wins, fills-empty-slot, no-worn-unchanged) + a CharacterPanel render test (paperdoll shows the worn adamant dart, not the satchel's dragon longsword; effstats = ⚔113 from the worn piece).

## Gates
- [x] `equipped`/`deriveStats` factor in `worn`; absent worn → identical (3 unit tests + backward-compat)
- [x] paperdoll/equiplist render the worn piece, not the satchel-best (render test)
- [x] Full UI suite (236, +4) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f)

## Follow-ups
- A richer paperdoll GRID (per-item silhouettes in an OSRS slot layout) vs the current SVG figure + 2-col list.
- Optional: a "you hold a stronger X" nudge when a worn slot is beaten by a usable satchel piece (the inverse of the 🔒 locked-upgrade hint; `equipBest` already one-clicks the fix).
