# Phase: Exchange Wars — Phase 12r: "Sell the Spoils" Keeps Your Gear (Brick 122)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UX safety — stop a one-click bulk-sell from dumping the player's raiding kit)
**Goal:** The bulk "sell the spoils" button sells loot only; gear is kept (sell gear deliberately, per-item). UI-only, live on main.
**Done condition:** bulk sell excludes GEAR; per-item "sell @ bid" still sells anything; pure helper + render tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
Gear lives in the satchel between raids (the pack auto-equips your best for an expedition). The existing "sell the spoils" button dumped EVERY sellable stack — including your rune/dragon kit. One click could liquidate an expensive raiding loadout you'd spent the game assembling. That's a real, costly footgun, and the fix is a default-safety change, not a new readout.

## Outcome
- `game.ts`: `lootSpoils(heldIds, isGear)` → the non-gear stacks a bulk sell should dump. Pure.
- `PlayerPanel.tsx`: the bulk "sell the spoils" now sells `lootSpoils(sellable, GEAR-predicate)` and only shows when 2+ NON-gear stacks exist; title spells out "your raiding kit is kept (sell gear one stack at a time)". The per-item "sell @ bid" is unchanged — selling a specific gear stack is still a deliberate one-click choice.
- Tests (+2): pure `lootSpoils` (gear filtered out) + a render test that ticks the world to populate NPC bids, stocks loot + a gear sword, clicks "sell the spoils", and asserts the loot sold while `rune_2h_sword` did NOT. 340/340 unit, 9/9 e2e. FINDINGS #156.

## Gates
- [x] `lootSpoils` pure (gear excluded)
- [x] Bulk sell dumps loot, keeps gear (render test, real NPC bids)
- [x] Typecheck + 340 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A "sell gear too" override toggle for players who really mean it.
