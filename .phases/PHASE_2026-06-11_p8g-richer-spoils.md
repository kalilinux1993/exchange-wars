# Phase: Exchange Wars — Phase 8g: Richer Spoils (Expeditions Brick 7)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc — loot depth)
**Goal:** Caches hold more than coin: 25% roll an item from a region-tiered pool (runes/ammo at the surface → bars and food mid → gear pieces in the deeps), minted into the pack like monster drops. Stats gain cacheFinds + diceWon; deeds gain Lucky Find and High Roller (3 dice wins, progress).
**Done condition:** pools reference real catalog ids (integrity-gated), cache items conserve, both deeds latch, gates green, fn redeployed, CI + live.

## Scope (in)
- quest.ts CACHE_LOOT (region-indexed pools); advance cache branch mints items; stats.cacheFinds/diceWon
- Deeds 'lucky-find' / 'high-roller'; tests; verify-score redeploy

## Gates
- [ ] typecheck + unit + e2e green; fn redeployed
- [ ] CI green + live verified
