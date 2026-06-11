# Next Steps

## Phase 1 leftovers (minor, non-blocking)
- [x] ~~Hard cap on resting orders per agent/book~~ DONE phase 6s: MAX_RESTING_PER_AGENT_BOOK=16 in placeOrder, hash-proven non-binding in healthy sims
- [ ] Trades window: switch `shift()` to ring buffer if window grows beyond 512
- [x] ~~Property tests over many random seeds~~ DONE phase 6r: manyseed.test.ts — 64 derived seeds × conservation + snapshot-resume hash equality, ~30s (no fast-check dependency needed)
- [ ] Determinism gate at 100k ticks in a slow/CI-only suite (current: 1.5k–6k ticks in the fast suite)

## Phase 2 — DONE 2026-06-10 (command protocol, slots, offline accrual)

## Phase 2b — DONE 2026-06-10 (NPC bailouts, production burn, flipper v3)

## Phase 2c — DONE 2026-06-10 (buyUpgrade, idle policy, autoFlip tiers, runFlipper extraction)

## Phase 2d — DONE 2026-06-10 (balance harness, tier-3 fix, balance gate)

## Phase 3 — DONE 2026-06-10 (npm workspace split: packages/{engine,cli})

## Phase 4a — DONE 2026-06-10 (UI shell: packages/ui, playable in browser)

## Phase 4b — DONE 2026-06-10 (Playwright E2E green; caught + fixed broken dev server)

## Published 2026-06-10 — LIVE at https://kalilinux1993.github.io/exchange-wars/
Repo: https://github.com/kalilinux1993/exchange-wars (public). Redeploy = `npm run build -w @exchange-wars/ui -- --base=/exchange-wars/`, then push dist to gh-pages.

## NEXT PHASE (designed, per Jesse): OSRS Wiki-powered catalog
Build-time snapshot generator — keeps the engine deterministic:
- `npm run gen:catalog` (packages/cli): fetch prices.runescape.wiki/api/v1/osrs `/mapping` + `/latest` + `/volumes` (descriptive User-Agent; few calls, build-time only — rate-limit gotchas in master memory)
- Select ~40–50 items: top daily volume, price ≥ ~30gp; derive anchors baseCost ≈ 0.75×price, consumeValue ≈ 1.5×price, volatility by tier/timeseries; keep REAL item ids + names; optionally wire GE buy limits to qty caps later
- Download icons once to packages/ui/public/icons/{id}.png (`oldschool.runescape.wiki/images/<icon>`; credit line in README); MarketTable/ladder show icons
- Known recurring cost: catalog regen re-rolls all seeds → routine tier-1 sweep + gate re-verify; ~50 items ≈ 350 agents → suite slows (CI budget already 120s; trim balance seeds if needed)
- Explicitly NOT live price sync (breaks determinism/saves/gates); a real-price display overlay could come later as decoration

## PHASE 6 (per Jesse): Login & cloud saves — "trade on the GE from anywhere"
Design (account-light, static-site-friendly — Supabase):
- **Jesse's 2-minute part (BLOCKER):** create a free project at supabase.com → Settings → API → send me the Project URL + anon public key (safe to embed in the client)
- My part: @supabase/supabase-js in packages/ui; magic-link (email) sign-in UI in the masthead; `saves` table (user_id PK, save_json jsonb, updated_at) with row-level security (SQL provided); sync: load cloud save on login (latest-wins vs local by updated_at), debounced autosave push; offline accrual unchanged (lastSeenMs works across devices — close on PC, open on phone, the world advanced)
- Determinism untouched: the save IS the world; the server just stores it
- Later in this arc: leaderboards via replay verification (submit seed+command-log; server re-runs it — the original anti-cheat-by-determinism design), name/flair on the board
- Explicitly NOT (yet): shared-world multiplayer — that's a different engine (server-authoritative, non-deterministic); possible future arc, big
- Alternative if preferred: Cloudflare Workers+D1 (also needs his account) — Supabase recommended (auth built in)

## Phase 6k — DONE 2026-06-10 (tier-3 printer closed: vol ceiling 0.12 / cadence 4; gate magnitude ceiling 20×; FINDINGS #35)

## RPG arc — queued (post phases 8k–8q, data in FINDINGS #45–#51)
- **Encounter depletion** (structural kill-rate bound, FINDINGS #51): cleared regions run dry (monster encounter chance drops once cleared ≥ 3 in an expedition), bounding the TAS-route tail without rate nerfs. Pair with pricing startExpedition (a tick?) so the re-embark loop doesn't reset it for free.
- ~~Bestiary & loot vs the honest economy~~ DONE phase 8q: ladder-climbing harness policy (the real fix), deep monsters pay goods-over-coin, market absorption caps the take. Table: naked +4–7k · geared −13k…+130k (deaths burn gear) · TAS tail 150–384k.
- ~~Cache loot redesign~~ DONE phase 8p: supplies-only pools (gear comes from monsters); flee-route dead.
- ~~Antifire as the dragon-farm key item~~ DONE phase 8r: armor-piercing breath, expedition-long coating, 17.3k ticket per dive; table healthy (naked +4–7k · geared +38–206k · tail ~260k).
- ~~Hitpoints as a third trained stat~~ DONE phase 8s: xp = dealt/3, +2 maxHp/level, all five "full hp" sites honor the trained max; old saves = level 1 by construction.
- ~~7th region~~ DONE phase 8t: the Inferno Gate (pyrefiend/lava dragon, elite Zukrath, all-dragonfire — the antifire ticket is mandatory; Hellwalker deed).
- ~~Region-flavored events~~ DONE phase 8u: portal (depth tourism), imp (no-stake blood gamble), merchant (3× shark resupply) — depth-gated pool, conservation-clean.
- ~~Bestiary + stat deeds~~ DONE phase 8v; ~~Sell the spoils + Monster Scholar deed~~ DONE phase 8w: bidWalk floor-price dumps (instant fills, no residue), satchel valued as the bids see it.
- Content ideas: gear durability as a market sink; an 8th region someday (the chain auto-extends); more event faces (~30 lines each).
- ~~Liquidation-value scoring~~ DONE phase 8o: bid-walk mark excluding own bids; UI playerWorth = engine netWorth (display and arbiter agree); all gates held.
- Hitpoints level (maxHp growth from xp) — natural third stat once Attack/Defence prove out.
- ~~Geared-grind measurement~~ DONE phase 8m: capital loop validated (median geared +16.6k vs naked +1–3.9k, depth 4–5); bones faucet nerfed 1→0.15.
- ~~Grind-vs-trade loot parity tuning~~ RESOLVED phase 8l as a side effect of wounds: naked grind +0.3k–3.9k, inside trading's band (FINDINGS #46).
- ~~Price the extract→re-embark heal loop~~ DONE phase 8l: persistent hp + out-of-field regen (REST_REGEN_TICKS=3), death leaves 1 hp.
- Region-flavored event variants; gear durability as a market sink; more bestiary/regions (idea pile from the RPG arc)

## Next candidates
- Quests/contracts: NPC buy-contracts at premium ("deliver 50 lobsters") — goal-directed trading (FINDINGS #28)
- ~~Tier-3 clerk perk: "trades events too"~~ DROPPED: contradicts the human-territory design rule (FINDINGS #27/#35 — clerks farm neither events nor exotics)
- ~~News history panel + event outcomes~~ DONE (Chronicle phase 6g; outcome % chips phase 6j); prestige/rebirth loop; ghost leaderboards (LOCAL half done phase 6u — same-seed chart ghosts; shared ghosts need the P5 server)
- ~~Offline-cap/payback design pass~~ CLOSED: cap 100k vs paybacks 43k–90k — tier 1 pays back in ~half a cap, by design
- Offline-cap/payback design pass (cap 50k ticks vs tier paybacks 40k–97k — tier 1 pays back in ~one full offline cap; intentional?)
- ~~CI actions deprecation~~ DONE phase 6l (checkout v6, setup-node v6, pages artifact v5, deploy-pages v5)
- ~~Achievements / milestones panel~~ DONE (panel + 15 deeds as of phase 6n)
- ~~Sound-free juice: fill flash animations~~ DONE phase 6l (My Trades row flash + feed panel glow)
- **CI (GitHub Actions)**: typecheck + test + e2e on push; auto-deploy Pages on main (replaces the manual gh-pages push)
- **Phase 4c — PWA**: manifest, service worker, offline accrual on reopen (compute elapsed → fast-forward)
- Jesse steering pass on art direction / game-feel (current theme explicitly provisional)
- Payback-period design targets for upgrades; momentum bleed (FINDINGS #12) — both low priority

## Phase 3 — Workspace hardening
- Split into pnpm workspaces: packages/{engine,cli,botkit} per architect design (deliberately deferred from Phase 1)
- CI (GitHub Actions): typecheck + test + purity gate

## Phase 4 — React PWA UI (reuse Bank-Made shell patterns; Playwright E2E against seeded worlds)
## Phase 5 — Server + leaderboards (replay seed+command-log server-side to verify scores — determinism IS the anti-cheat)
