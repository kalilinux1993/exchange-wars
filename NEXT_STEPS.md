# Next Steps

Live: https://kalilinux1993.github.io/exchange-wars/ · repo github.com/kalilinux1993/exchange-wars
Deploy: push to main → CI (typecheck + vitest + e2e) auto-deploys Pages. Verifier: `npm run build:fn` + `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv` (needs SUPABASE_ACCESS_TOKEN) — required in the same phase as any replay-affecting engine change.

Through brick 49 (9w): RPG layer (8 regions, stats/xp, brews, bounties, sellsword), OSRS HUD (map/paperdoll/combat-scene/combat-level/titles), trading tools (movers/watchlist/sparkline/almanac), robustness (error boundary + corrupt-save quarantine), art pipeline. Details in `.phases/` + DEV_GUIDE consolidations + FINDINGS #1–#83.

## Queued candidates (rough priority)
- **POPULATE ART**: drop game-icons.net (CC BY) / CC0 SVGs into `packages/ui/src/assets/icons/` (naming in the folder README), credit in CREDITS.md; route monster/item/region glyphs through `<Icon>`. Auto-fetch is impossible (WebFetch strips SVG paths) — Jesse-drop or hand-author originals.
- **HUD depth**: richer paperdoll (per-item silhouettes); ~~monster shape variety~~ DONE 9y; ~~equip discoverability~~ DONE 9z (Pack & Equip rename + ⚔ equip best button + Ledger pointer); inventory/equipment grid; OSRS-style icon sub-tabs if a room crowds.
- **Trading**: ~~market-breadth line~~ DONE 10a; ~~price alerts~~ DONE 10b (buy-below threshold, latched toast, 🔔 row); sparkline in market-table rows.
- **Code health**: ~~usePref helper~~ DONE 10c (loadouts/watch/alerts via usePref; title/room stay bespoke — raw-string / validated-enum).
- **Robustness**: UI to restore/export a quarantined save on next boot; guard monsterById/itemDef at UI read sites; 100k-tick determinism gate in a CI-only suite.
- **RPG content**: more event faces (8 so far: shrine/gamble/imp/portal/merchant/spar/toll/courier — 10d added risk-banking; next bends a still-untouched system); a 9th region (needs a NEW resource to extort); an attack/strength brew (needs a clean attack-flavored catalog potion); encounter depletion (only if an audit shows the TAS tail needs bounding).
- **Progression sinks**: 10e added the Death Ward (100k → keep 5 on death). More gp sinks that aid raiding (a 2nd ward tier? a stat-respec? a bank-space cap?) keep big bankrolls meaningful.
- **Jesse-gated**: prestige/rebirth loop; a deeper art-direction steering pass.

## Decided / dropped
- **Gear durability — DROPPED** (FINDINGS, 9g): raiders already pay spread + death burns + tick cost + consumable tickets; a durability tax re-punishes the validated capital loop for no asked-for benefit.
- **Tier-3 clerk "trades events too" — DROPPED**: clerks farm neither events nor exotics (FINDINGS #27/#35).

## Old minor leftovers (non-blocking)
- Trades window: `shift()` → ring buffer if it ever grows beyond 512.
- Momentum traders bleed slowly (FINDINGS #12) — acceptable.
