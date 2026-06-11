# Next Steps

Live: https://kalilinux1993.github.io/exchange-wars/ · repo github.com/kalilinux1993/exchange-wars
Deploy: push to main → CI (typecheck + vitest + e2e) auto-deploys Pages. Verifier: `npm run build:fn` + `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv` (needs SUPABASE_ACCESS_TOKEN) — required in the same phase as any replay-affecting engine change.

## OSRS HUD arc (Jesse-directed 2026-06-11, started 9k)
- 9k DONE: SVG region map, paperdoll + skills strip, compact deed badge grid.
- 9l DONE: combat scene — figure vs generated monster, hp bars, hit-splats (render-diff animation, no engine timers).
- 9p DONE: combat level (derived 1→99) + worn titles (earned deeds) on the character panel.
- 9m DONE: art pipeline — Icon loader (import.meta.glob auto-discovery, emoji fallback), CREDITS.md, assets README. Jesse chose game-icons.net (CC BY) + CC0 packs.
- 9n DONE: original sword/shield/heart skill icons as the default set (WebFetch markdown-converts SVGs → can't auto-pull game-icons; originals are replaceable same-filename).
- **POPULATE MORE ART**: route monster/item/region glyphs through `<Icon>` and author originals (or Jesse drops game-icons CC BY / CC0 files — same-name overrides the defaults, credit in CREDITS.md). game-icons auto-fetch is NOT possible with current tools (markdown conversion strips paths) — Jesse-drop or hand-author only.
- **Next steps**: richer paperdoll (per-item silhouettes, not just lit plates); OSRS-style icon tabs WITHIN rooms if panels crowd; an inventory/equipment grid view; level-up flash on the skills strip; monster variety in the scene (more shapes, not just hue). Raster sprites would need real art assets — SVG is the deterministic, dependency-free path; keep going SVG unless Jesse supplies art.
- Jesse-gate check-in: confirm the SVG direction matches his mental image before investing in deeper art.

## Trading-side polish
- 9t DONE: Market Movers panel (hot/cold vs EMA, click-to-load) in the Exchange room.
- Candidates: per-item price sparkline in the ticket; a market-breadth/index line; watchlist/price alerts.

## Queued (real candidates, in rough priority)
- **Idle raiding ("the Sellsword")**: the clerk flips while you're away; nothing raids while you're away. A hireable companion running a fixed shallow-region policy inside tickWorld would complete the idle game's second half. BIG brick: engine automation + balance audit + offline interaction — bring full attention, measure with tools/audit-grind.ts before/after.
- **Encounter depletion** (structural kill-rate bound, FINDINGS #51): cleared regions run dry within an expedition. Only if a future audit shows the TAS tail needs bounding — it currently doesn't.
- **9th region someday**: wants a NEW resource to extort (precedent: Maw=potion, Inferno=potion+nerve, Abyss=purse+DPS).
- More event faces (~30 lines each; each should bend a system no other face touches — FINDINGS #64).
- Sub-tabs within rooms if any room re-clutters.
- Prestige/rebirth loop — **Jesse-gated** (design conversation first).
- Art direction / game-feel steering pass — **Jesse-gated** (theme explicitly provisional).

## Robustness (Jesse asked; ongoing)
- 9o DONE: app-level error boundary (catches render crashes, save-safe recovery card).
- 9q DONE: corrupt-save quarantine — shape gate + `<key>-corrupt` backup on boot-load failure (no silent destruction).
- Candidates: a UI surface for the quarantined save (offer to restore/export it on next boot, vs only via devtools); guard monsterById/itemDef at UI read sites; a slow/CI determinism gate at 100k ticks.

## Decided / dropped (so they stop haunting the pile)
- **Gear durability as a market sink — DROPPED 2026-06-11**: every audit since 8l shows raiders already pay three honest taxes (bid/ask spread on kit ~20k, death burns, tick opportunity cost), and the potion ticket (8r) + merchant/toll (8u/9d) added consumable sinks. A durability tax would re-punish the capital loop 8m validated, for bookkeeping nobody asked for. Revisit only if an audit shows gear hoarding distorting books.
- Tier-3 clerk "trades events too" — DROPPED (clerks farm neither events nor exotics, FINDINGS #27/#35).

## Old minor leftovers (non-blocking)
- Trades window: switch `shift()` to ring buffer if window grows beyond 512.
- Determinism gate at 100k ticks in a slow/CI-only suite (current fast suite: 1.5k–6k).
- Momentum traders bleed slowly (FINDINGS #12) — acceptable, low priority.

Everything shipped through Phase 9f (bricks 1–32) is recorded in `.phases/` and FINDINGS; the DEV_GUIDE's consolidated entry maps the current system.
