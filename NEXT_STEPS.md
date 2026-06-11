# Next Steps

Live: https://kalilinux1993.github.io/exchange-wars/ · repo github.com/kalilinux1993/exchange-wars
Deploy: push to main → CI (typecheck + vitest + e2e) auto-deploys Pages. Verifier: `npm run build:fn` + `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv` (needs SUPABASE_ACCESS_TOKEN) — required in the same phase as any replay-affecting engine change.

Through brick 59 (10g): RPG layer (8 regions, stats/xp, brews, bounties, sellsword, death ward, 8 event faces), OSRS HUD (map/paperdoll/combat-scene with monster silhouettes + gear-reactive fighter/combat-level/titles), trading cockpit (movers/watchlist/alerts/pulse/sparkline/almanac/abort-all), robustness (error boundary + corrupt-save quarantine), art pipeline. Details in `.phases/` + DEV_GUIDE consolidations (8h–9f, 9g–9w, 9y–10g) + FINDINGS #1–#93.

## Queued candidates (rough priority)
- **ART status**: skill icons (9n), item category icons (10o), monster portraits in the bestiary (10p — shared MonsterBody) all original SVG. Remaining: region icons on the map; or Jesse drops game-icons.net (CC BY)/CC0 SVGs (same filename overrides item-*/skill-* originals). Auto-fetch impossible (WebFetch strips SVG paths).
- **HUD depth**: richer paperdoll (per-item silhouettes); inventory/equipment grid; OSRS-style icon sub-tabs if a room crowds.
- **Trading**: ~~suggested-flip margin line~~ DONE 10j; ~~fair-value band~~ DONE 10m (cheap/fair/rich vs cost→value); sparkline in market-table rows.
- **Robustness**: UI to restore/export a quarantined save on next boot; guard monsterById/itemDef at UI read sites; 100k-tick determinism gate in a CI-only suite.
- **RPG content**: more event faces (each bends a still-untouched system — FINDINGS #64); a 9th region (needs a NEW resource to extort); ~~attack brew~~ DONE 10n (goading → +10 atk/dive, the offensive counterpart to bastion); encounter depletion (only if an audit shows the TAS tail needs bounding).
- **Progression**: 10i region-mastery xp; 10k sellsword haul counters; 10l offline sellsword summary in the away-bar. More: final-region (Abyss) mastery hook; gp sinks that aid raiding.
- **Social/retention**: ~~daily shared seed~~ DONE 10q; ~~"today" badge in the clock when active seed == dailySeed()~~ DONE 10r. Next: a daily-streak counter (consecutive UTC days the player launched the daily, localStorage); show the daily badge / "today's board" framing on the leaderboard view itself; a "🏁 daily best" personal record per day.
- **Jesse-gated**: prestige/rebirth loop; a deeper art-direction steering pass.

## Decided / dropped
- **Gear durability — DROPPED** (FINDINGS, 9g): raiders already pay spread + death burns + tick cost + consumable tickets; a durability tax re-punishes the validated capital loop for no asked-for benefit.
- **Tier-3 clerk "trades events too" — DROPPED**: clerks farm neither events nor exotics (FINDINGS #27/#35).

## Old minor leftovers (non-blocking)
- Trades window: `shift()` → ring buffer if it ever grows beyond 512.
- Momentum traders bleed slowly (FINDINGS #12) — acceptable.
