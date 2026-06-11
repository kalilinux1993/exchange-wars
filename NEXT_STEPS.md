# Next Steps

Live: https://kalilinux1993.github.io/exchange-wars/ · repo github.com/kalilinux1993/exchange-wars
Deploy: push to main → CI (typecheck + vitest + e2e) auto-deploys Pages. Verifier: `npm run build:fn` + `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv` (needs SUPABASE_ACCESS_TOKEN) — required in the same phase as any replay-affecting engine change.

Through brick 59 (10g): RPG layer (8 regions, stats/xp, brews, bounties, sellsword, death ward, 8 event faces), OSRS HUD (map/paperdoll/combat-scene with monster silhouettes + gear-reactive fighter/combat-level/titles), trading cockpit (movers/watchlist/alerts/pulse/sparkline/almanac/abort-all), robustness (error boundary + corrupt-save quarantine), art pipeline. Details in `.phases/` + DEV_GUIDE consolidations (8h–9f, 9g–9w, 9y–10g) + FINDINGS #1–#93.

## Queued candidates (rough priority)
- **ART status**: skill icons (9n), item category icons (10o), monster portraits in the bestiary (10p — shared MonsterBody) all original SVG. Remaining: region icons on the map; or Jesse drops game-icons.net (CC BY)/CC0 SVGs (same filename overrides item-*/skill-* originals). Auto-fetch impossible (WebFetch strips SVG paths).
- **HUD depth**: ~~"train to unlock" gear hints~~ DONE 10w. Next: per-slot item ICONS in the equiplist (itemIcon pipeline exists); richer paperdoll (per-item silhouettes); inventory/equipment grid; OSRS-style icon sub-tabs if a room crowds.
- **Feedback/idle**: ~~earning-rate cue~~ DONE 10x; ~~compact big-number formatting~~ DONE 10y (`fmtCompact`, masthead aggregates). Next: extend `fmtCompact` to the away-bar gp gain + milestone targets if they read long; a tiny worth sparkline beside the rate; surface other unsurfaced lifetime stats (bountiesClaimed, contractsFilled, sellswordBanked) in a records line.
- **Trading**: ~~suggested-flip margin line~~ DONE 10j; ~~fair-value band~~ DONE 10m; ~~market-row sparkline~~ already built; ~~"best flips now" ranked strip~~ DONE 10v (`rankFlips`, click-to-select, Movers-style). Next idea: factor in buy-limit / available depth so the strip ranks by *realizable* profit, not just per-unit margin; or a one-click "place this flip" that loads both legs.
- **Robustness**: ~~UI to restore/export a quarantined save on next boot~~ DONE 10u (boot recovery bar: download/discard/dismiss). Remaining: guard monsterById/itemDef at UI read sites; 100k-tick determinism gate in a CI-only suite.
- **RPG content**: more event faces (each bends a still-untouched system — FINDINGS #64); a 9th region (needs a NEW resource to extort); ~~attack brew~~ DONE 10n (goading → +10 atk/dive, the offensive counterpart to bastion); encounter depletion (only if an audit shows the TAS tail needs bounding).
- **Progression**: 10i region-mastery xp; 10k sellsword haul counters; 10l offline sellsword summary in the away-bar; ~~lifetime records profile~~ DONE 10z (RecordsPanel in the Hall). More: final-region (Abyss) mastery hook; gp sinks that aid raiding.
- **Social/retention** (daily loop CLOSED — ember + nudge share one "day" definition): ~~daily shared seed~~ 10q; ~~"today" badge~~ 10r; ~~streak counter~~ 10s; ~~streak-at-risk nudge~~ 10t. Leftover daily polish (low priority, pivot away for a few bricks): "today's board" framing on the leaderboard view; a "🏁 daily best" personal record per day. **Deliberately pausing the daily arc — 4 bricks deep; next bricks should hit other systems (RPG content / trading / robustness) for breadth.**
- **Input/UX**: ~~keyboard shortcuts (1/2/3 rooms, p pause, ? help)~~ DONE 11a. Next: market-row nav (j/k or ↑/↓) — needs MarketTable to expose its displayed order so nav matches what's on screen; quick-select digits for top market rows.
- **Jesse-gated**: prestige/rebirth loop; a deeper art-direction steering pass. **Engine content (9th region, event faces, gp sinks) is blocked on `SUPABASE_ACCESS_TOKEN` to redeploy verify-score in the same phase — needs Jesse present.**

## Decided / dropped
- **Gear durability — DROPPED** (FINDINGS, 9g): raiders already pay spread + death burns + tick cost + consumable tickets; a durability tax re-punishes the validated capital loop for no asked-for benefit.
- **Tier-3 clerk "trades events too" — DROPPED**: clerks farm neither events nor exotics (FINDINGS #27/#35).

## Old minor leftovers (non-blocking)
- Trades window: `shift()` → ring buffer if it ever grows beyond 512.
- Momentum traders bleed slowly (FINDINGS #12) — acceptable.
