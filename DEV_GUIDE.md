# Dev Guide

## Phase 6l — Fill Flash & CI Action Bumps (2026-06-10)

- **Fill juice** — TradeFeed (packages/ui/src/components/TradeFeed.tsx): My Trades rows use content-based keys (`fillKey`; unique because `recordFills` dedupes identical fills), so a row's DOM mount == a new fill and the CSS mount animation (`fill-flash`, styles.css) is a one-shot flash. The panel itself glows (`feed-glow`) once per new personal fill via a lazy-init max-tick ref — loading an old save doesn't glow. `prefers-reduced-motion` disables both.
- **CI actions bumped** (.github/workflows/ci.yml): checkout v4→v6, setup-node v4→v6, upload-pages-artifact v3→v5, deploy-pages v4→v5 (verified current via releases pages; all Node-24 native — Node 20 action runtime dies 2026-09). The `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env workaround is gone, now redundant. Caveat noted for the future: upload-pages-artifact v4+ excludes dotfiles unless `include-hidden-files: true` — our vite dist has none.

## Phase 6k — Tier-3 Money Printer Fix (2026-06-10)

- **Tier-3 vol ceiling 1 → 0.12, cadence 5 → 4** (TUNING.automation.autoFlip[2], packages/engine/src/agents.ts) — closes FINDINGS #33 (clerk farming high-priced exotics for +140k–195k/8k ticks). Two-leg cadence sweep: cad 4 min +2,094, medians +4,801/+4,257. Design rule: events AND exotics are human territory.
- **No UI/commands change needed**: `actIdlePlayer` min()s `botConfig.maxVolatility` against the tier ceiling, so the UpgradeShop "tier max" risk option is bounded automatically.
- **Balance gate magnitude ceiling** (packages/engine/test/balance.test.ts): every tier median < 20× tier-1 median, both scenarios — printers can no longer hide behind sign/ordering-only checks.
- **New test** (packages/engine/test/automation.test.ts): tier 3 refuses a vol-0.13 book at a fat margin while flipping the stable item next to it.

## Phase 6j — Catalog 68 & Event Outcomes (2026-06-10)

- **Catalog 68** (48 staples + 20 exotics; new staples incl. silver ore, soft clay, mithril nails). Routine re-roll sweep → tier 2 **cadence 8 / vol 0.12** (FINDINGS #34: the competitive-only sweep picked a config that failed isolated — always sweep both scenarios).
- **Chronicle event outcomes** — `updateNews` (packages/ui/src/game.ts) snapshots the book EMA when an event is headlined (`seenEvents[].startPrice`) and stamps the ending entry with `move` (% EMA change over the event's life); NewsLog renders it as a signed +/− chip colored up/down. Pre-outcome saves lack `startPrice` → plain ending, no chip.
- **FINDINGS #33 (queued fix):** tier 3 farms high-priced exotics for +140–195k/8k ticks — the balance gate is sign/ordering-only and can't see magnitude. Next phase.

## Phase 6h — My Trades (2026-06-10)

- **Personal fill log** — `recordFills` (packages/ui/src/game.ts) latches player-involved trades out of the rolling window into `Game.fills` (cap 50, persisted, scan-cursor + tail-dedupe for same-tick rescans). Tape panel toggles tape|mine.

## Phase 6g — Sorting, Save Portability & CI Scaling Fix (2026-06-10)

- **CI red fixed** (Phase 6f's run timed out at 120s on ubuntu): the offline-accrual spec now runs on a TINY 1-item world — it tests game.ts clock logic, not the economy; never drag the full ~470-agent world through a 100k-tick jsdom test. Balance gate budget → 240s. **Rule: world-size-independent tests get world-size-independent fixtures.**
- **Sortable market columns** — click item/bid/ask/last/volume headers (▲/▼, empty books sink to the bottom); composes with the filter.
- **Save export/import** — export downloads the save JSON; import loads a file (validated via `importSaveString`, normalized, offline-accrued against now). Your safety net until cloud sync is activated — and a sneaky save-share mechanism.

## Phase 6f — Max Button, Chart Labels & Catalog VIII (2026-06-10)

- **Ticket "max"** — fills qty: buys = floor(gp/price) capped by the item's remaining buy limit; sells = all held.
- **Fortune chart** shows low/high/now alongside the start baseline.
- **Catalog 64** (44 staples + 20 exotics). Routine sweep → tier 1 cadence 8 / vol 0.09. NOTE: dropping the ceiling below 0.10 required automation test fixtures to use vol ≤ 0.09 items (they were 0.10 — the bot correctly refused to trade them).

## Phase 6e — Market Filter & Keyboard (2026-06-10)

- **Market filter** — live name-substring filter in the Grand Exchange header with shown/total count (local component state).
- **Space = pause/play** — window keydown in App, toggles speed 0 ↔ last speed; ignores INPUT/SELECT/TEXTAREA/BUTTON targets.

## Phase 6d — Onboarding & Deeds Progress (2026-06-10)

- **First-run guide** — HelpOverlay (scrim + parchment, 7-point how-to) shows once per DEVICE (localStorage `ew-help-seen`, deliberately not in the save); "?" chip reopens. E2E specs dismiss it via `dismissHelp(page)`; jsdom is unaffected (no hit-testing).
- **Deeds progress** — Milestone defs gained optional `progress()`; locked worth deeds show % (capped 99).

## Phase 6c — Trader UX & Catalog VII (2026-06-10)

- **Clickable ladder** — lifting an ask loads a BUY at that price into the ticket; hitting a bid loads a SELL (BookLadder `onLevel` → `TicketPrefill` with a nonce so repeat clicks re-apply).
- **Satchel value** total row in the Ledger.
- **Catalog 56** (`--exotics 16`); routine tier-1 sweep → cadence 9 / vol 0.10. Note: profits in the realistic-catalog era run ~1–3k per 8k ticks (thin real spreads) — the gate's positivity floor matters more than magnitude now.
- Test lesson (quartermaster spec): clicking the already-selected row bails out of React re-render — bounce through another row when a fresh render is required.

## Phase 6b — Challenge Seeds & Sync Polish (2026-06-10)

- **Seed picker** — New Game opens an inline seed form (suggested current+1, any integer): identical seeds = identical worlds = shareable challenges (the determinism-native "compete with a friend" primitive; pairs with future leaderboards).
- **Sync marker** — successful cloud pushes light "✓ synced" in the AccountBar (App tracks lastSync from pushCloudSave's result).

## Phase 6 — Login & Cloud Saves (2026-06-10)

- **Supabase** (packages/ui/src/cloud.ts): magic-link email auth + a `saves` table (one row per user, RLS — supabase/schema.sql). Publishable key embedded (public by design). Engine untouched — the cloud stores the same save JSON as localStorage.
- **Sync model**: on sign-in, `chooseSave` adopts whichever save has the newer `lastSeenMs` (cloud wins ties); adopting a cloud save runs offline accrual against NOW (cross-device "while you were away"); loser gets overwritten; 5s-debounced `pushCloudSave` after every command/fast-forward.
- **One-time Supabase console steps** (Jesse): paste supabase/schema.sql in the SQL editor; set Auth → URL Configuration → Site URL to the live URL.
- AccountBar in the masthead (sign-in input / signed-in email + sign out). `normalizeGame` shared by local + cloud loads.

## Phase 5d — GE Buy Limits (2026-06-10)

- **Buy limits are live**: per-player rolling windows (`BUY_LIMIT_WINDOW_TICKS` = 4,000 in commands.ts) against the catalog's REAL `buyLimit` values. Enforced at the command layer only (players + their automation; NPCs unaffected). Counted at **placement**, never refunded on cancel — stricter than OSRS fill-counting, immune to place/cancel churn (documented divergence).
- `AgentState.buyWindows` (absent = fresh window — old saves migrate implicitly); `MarketView.buyRemaining` (null = unlimited); ticket shows "buy limit left N"; rejection reason `'buy-limit'`.
- No catalog change → no world re-roll → no sweep needed; staples limits never bind routine flipping, gear limits bind cornering (as designed).

## Phase 5b — Chronicle & Wiki Metadata (2026-06-10)

- **Chronicle** — event begin/end headlines: `updateNews` + `Game.newsLog`/`seenEvents` (packages/ui/src/game.ts, capped 12, persisted; runs in refreshProgress); NewsLog panel under the market.
- **Wiki metadata** — generator now emits `wikiPrice` + `buyLimit` (ItemDef); the ticket shows "wiki snapshot X gp · GE limit Y". Buy-limit MECHANIC still queued.
- **Tier-3 re-tune** (FINDINGS #31): the staples-only real catalog compressed automation margins ~5× and made tier-3's vol ceiling inert; cadence 4→5 restores the gate. Queued: generator second-track picks (volatile/expensive items) to restore tier-3's niche.

## Phase 5 — OSRS Wiki Catalog (2026-06-10)

- **`npm run gen:catalog [-- --count N]`** (packages/cli/src/genCatalog.ts): snapshots prices.runescape.wiki (`/mapping` + `/latest` + `/volumes`, descriptive UA, polite delays) → top-N by volume (price ≥ 30, ≤ 10M, has GE limit + icon) → derives anchors (cost 0.75×, value 1.5×, tiered vol) → writes the GENERATED catalog.ts + downloads icons to packages/ui/public/icons/{wikiId}.png. Regen = re-rolled worlds: run the sweep + gates after.
- **Current snapshot:** 48 top-volume items (lava runes → mahogany planks) — real names, ids (`ItemDef.wikiId`), price scales, icons (MarketTable). Balance gate passed WITHOUT a sweep (liquid staples suit the bots).
- **Tests are now catalog-agnostic** — app.test.tsx + game.spec.ts derive everything from DEFAULT_ITEMS / row positions; regens won't break them. Lesson: real prices mean 1gp spreads — "bid+1" can cross (the ladder test learned this).
- vitest global timeout 120s (385-agent world); suite ~73s locally.

## Phase 4i — Contracts & Catalog VI (2026-06-10)

- **Quartermaster contracts** — `Contract` in types.ts; spawner in tickWorld (TUNING.contracts: every 400 ticks, 50%, ≤3 open, qty ≈ 8k gp ÷ EMA clamped [2..80], premium 1.15–1.35× EMA, 1.5–3k tick expiry); `fulfillContract` command: free-inventory-only delivery → items ledger-burned, payout ledger-minted, `stats.contractsFilled`. Old saves migrate (`contracts ??= []`, `nextContractId ??= 1`).
- **UI** — ContractsBoard panel (payout math, expiry countdown, deliver gated on inventory); 'Royal Contractor' milestone.
- **Catalog 32** (+death rune, red chinchompa). Routine tier-1 re-sweep (FINDINGS #29): cadence 10 / vol 0.10 (min +3,933).
- DEFERRED: tier-3 "trades events" perk — needs an event-end exit strategy first or it re-imports event variance into the balance gate.

## Phase 4h — World Events, Depth Ladder & Catalog V (2026-06-10)

- **World events** (the drama generator): `WorldEvent` in types.ts; spawner in `tickWorld` (TUNING.events: check every 250 ticks, 35%, 800–2000 tick duration, one event per item at a time; `stats.eventsSpawned`). Kinds: supply_shock (production halts), demand_surge (wage ×1.5, buffer +2), supply_glut (batch ×2), demand_slump (consumers sit out). All effects ride existing mint/burn paths — conservation-gated. Old saves migrate (`state.events ??= []` in tickWorld).
- **Stability architecture** (FINDINGS #26): MM bargain-hunter bid floor 0.6×cost; NPC speculative orders clamped to [0.55×cost, 1.25×value]. Events crash/bubble INSIDE the market gate band.
- **News-averse clerk** (FINDINGS #27): runFlipper skips items with active events — events are the human's edge. `activeEvent(state, itemId)` exported.
- **UI**: news chips under the masthead (rising events green, falling red); ⚡ via chips; **BookLadder** — top-5 levels per side for the ticket's item, depth bars, spread row, ◆ own orders.
- **Market Corner milestone** — own ≥50% of an item's circulating supply (≥25 units), computed from the conservation ledger.
- Catalog 30 (+snape grass, gold ore).

## Phase 4g — Milestones, Clerk Orders & More (2026-06-10)

- **Milestones** — 9 deeds in packages/ui/src/game.ts (MILESTONES + `checkMilestones` latch; persisted in `Game.milestones`); toast on unlock, Deeds panel in the right column. Checks run wherever worth is computed.
- **Clerk Orders (advanced AI bot options)** — `configureBot` command (engine): clamped patch {maxVolatility 0.01–1, capitalFraction 0.1–0.5, focusItemId | null, validated}; config can only make automation MORE conservative than its tier (runtime min with tier ceiling). `AgentState.botConfig`, exposed via `playerView().botConfig`. UI selects in the shop (risk/capital/focus). Engine tests prove the bot honors focus + tightened risk.
- **Catalog 28** (+willow, bronze bar, mithril bar, green d'hide, onyx bolt tips, dragon dagger). Tier-1 re-tuned via a config SWEEP (FINDINGS #24): cadence 8 / vol 0.10.
- **55k starting purse** (Jesse). OFFLINE_CAP_TICKS → 100k (~28h). Tape rows animate in; CI opts into Node 24 actions.

## Phase 4f — CI, Auto-Deploy & Mobile (2026-06-10)

- **CI** — .github/workflows/ci.yml: every push/PR runs typecheck + vitest + Playwright (chromium, --with-deps) on ubuntu; pushes to main then build with `--base=/exchange-wars/` and deploy to Pages via actions/deploy-pages (repo Pages `build_type=workflow`). **Manual gh-pages deploys are retired** — just push main.
- **Mobile** — market table scrolls horizontally (min-width 520px), ≤640px density pass; e2e spec runs the full ticket flow at 390×844.
- **50k starting purse** (Jesse's call) — first slot AND first automation tier reachable early.
- **Catalog 22** (+steel bar, amethyst). vitest testTimeout now 30s globally (sim gates on slow CI runners).

## Phase 4e — PWA, Offline Accrual & Catalog III (2026-06-10)

- **Offline accrual** — `applyOfflineProgress(game, nowMs)` in packages/ui/src/game.ts: 1 tick/sec of real time away (cap 50k ticks ≈ 14h, <60s ignored), clock injected for testability; `saveGame` stamps `lastSeenMs`. App shows a dismissible "while you were away" banner with ticks + worth delta.
- **PWA shell** — packages/ui/public: manifest.webmanifest + icon.svg + sw.js (network-first, cache fallback, same-origin GETs); registered in prod builds only, base-path aware.
- **Self-hosted fonts** — @fontsource/cinzel + ibm-plex-mono imported in main.tsx; Google Fonts links removed. E2E suite: 31.5s → 5.1s.
- **Catalog 20** — +cannonball, +abyssal whip (120k/220k; aspirational — automation budgets can't reach it, by design).
- Balance gate tests now carry `{ timeout: 30_000 }` — 30 sims × 8k ticks × ~130 agents outgrew the 5s default.

## Phase 4d — Catalog II & Game Feel (2026-06-10)

- **18-item catalog** (+feather, soft clay, dragon bones, runite ore) — speculator scaling absorbed it; one marginal balance cell fixed by tier-1 cadence 8→7 (coprime with the scripted player's 5, breaking phase-lock; improved tier 1 everywhere).
- **Fortune chart** — `Game.worthHistory` (throttled samples every ≥50 ticks, cap 240, persisted; `recordWorth` in packages/ui/src/game.ts), rendered by WorthChart with a start-gp baseline.
- **Tape** — TradeFeed renders the recent engine trade window; the player's own fills glow gold.
- Offline note: e2e boot spec slows to ~24s without network (Google Fonts link timeout) — self-hosting fonts is a queued improvement.

## Phase 4c — Catalog & Polish (2026-06-10)

- **14-item catalog** (packages/engine/src/catalog.ts): tiers from iron ore (80gp) to rune platebody (38k), volatilities 0.05–0.14. Keep `consumeValue ≳ 2× baseCost`.
- **Speculators scale with catalog** (sim.ts createWorld defaults) — see FINDINGS #21; explicit config counts still override (fixtures unaffected).
- **MarketView gained `bidDepth`/`askDepth`** (commands.ts) — exit-liquidity signal for bots/UI.
- **Flipper risk discipline** (agents.ts runFlipper): margin-% candidate ranking, qty capped at `bidDepth/2`, per-tier `maxVolatility` (TUNING.automation; scripted player trades everything).
- **UI**: header net worth + session profit (vs `Game.startGp`, defaulted for old saves); sparklines in MarketTable from `world.trades` (read-only world access OK — rule in CLAUDE.md); SVG coin favicon.
- Live site redeployed with all of the above.

## Phase 4b — Browser E2E (2026-06-10)

- **`npm run e2e`** — Playwright (chromium) drives the served game: packages/ui/e2e/game.spec.ts, config in packages/ui/playwright.config.ts (vite dev webServer on 5173). Fresh browser context ⇒ empty localStorage ⇒ deterministic seed-42 paused world ⇒ exact assertions.
- **5 specs:** boot (market + 30k purse), full trade round-trip (instant buy fill at ask → satchel → instant sell at bid → empty), fast-forward + save-survives-reload, slot purchase (purse debit, cap raise, next upgrade disabled), engine rejection reason surfacing.
- **Version rule learned the hard way (FINDINGS #20):** keep ONE vite version across the tree — vitest pins it at the root, so packages/ui must match (^8). A skew breaks `npm run dev` while build/jsdom stay green.

## Phase 4a — UI Shell (2026-06-10)

- **packages/ui** — Vite + React 19 + TS. `npm run dev` (root) serves it; `npm run build:ui` produces dist. The UI consumes ONLY the engine barrel.
- **The human is an idle-policy player** (packages/ui/src/game.ts `newGame`): engine-inert until automation is purchased, acting via `applyCommand` from click handlers — the same surface as every bot. Starting purse 30k gp.
- **Game loop lives in the page** (App.tsx): `setInterval` ticks the world at 0/1/5/20 tps (starts paused); fast-forward buttons call `runTicks(1k/10k)` instantly. Save/load = localStorage JSON snapshot (`SAVE_KEY`); new-game bumps the seed.
- **Components** — MarketTable (row click loads ticket; ◆ marks your best offers), TradeTicket (bid+1/ask−1 helpers, post-tax math, engine rejection reasons), PlayerPanel (inventory @ last, open offers with abort), UpgradeShop (slots + autoFlip tiers, affordability-gated).
- **Tests** — packages/ui/test/app.test.tsx (jsdom): 6 flows through the REAL engine — render, place (escrow assert), abort (refund assert), reject reason, fast-forward determinism, upgrade gating.
- **Aesthetic (provisional)** — "medieval trading terminal": iron/stone/parchment/gold, Cinzel + IBM Plex Mono, green/red sides, staggered panel rise. Jesse steers from here.

## Phase 3 — Workspace Split (2026-06-10)

- **npm workspaces** — `packages/engine` (`@exchange-wars/engine`: all sim code + the 11 test suites) and `packages/cli` (run.ts, balance.ts importing the package). Engine exports `./src/index.ts` (a barrel — the ONLY entry other packages may import); no build step, tsx/vitest consume TS directly.
- **Divergence from architect's pnpm pick, recorded:** npm 11 native workspaces, zero new tooling, identical structure. Future packages are siblings: `packages/ui` (Phase 4), `packages/server` (Phase 5).
- **Configs** — root `tsconfig.base.json` + per-package extends; single root vitest config (`packages/*/test/**`); root scripts proxy (`npm test/sim/balance` unchanged).
- All moves were `git mv` (history follows); doc citations audited post-move (70 checked, 1 cosmetic fix).

## Phase 2d — Idle Tier Balance Pass (2026-06-10)

- **Balance harness** — `npm run balance [-- --ticks N]` (packages/cli/src/balance.ts) prints the tier × scenario × seed profit matrix with payback estimates. Measurement core is `measureIdleTier` in packages/engine/src/harness.ts (pure; shared with the gate).
- **Balance gate** — packages/engine/test/balance.test.ts: tiers 1–3 must profit on EVERY seed in BOTH scenarios (kills catastrophic regressions), and tiers 2–3 must beat tier 1 by median (outlier-robust). Runs at 8k ticks (6k is too short — FINDINGS #19).
- **Final curve** (8k ticks, isolated/competitive medians): tier 1 1382/354 · tier 2 1561/1353 · tier 3 1768/1364. Tier configs: cadence 8/6/4, flips 1/2/2, qty 6/8/10, capitalFraction 0.25/0.25/0.35 (tier-3 fraction inert at 150k capital, future-proofing).

## Phase 2c — Idle Automation Tiers (2026-06-10)

- **Player policies** — `AgentState.policy`: `'scripted-flipper'` (default; the active-play stand-in) or `'idle'` (engine-side automation only). Dispatch in `actAgent` (packages/engine/src/agents.ts): scripted gates on cadence 5; idle players gate on their tier's own cadence.
- **buyUpgrade command** — `PROGRESSION.upgrades.autoFlip` in packages/engine/src/commands.ts: 3 tiers (50k/150k/400k, burned like slots). Tiers stored in `AgentState.upgrades`; `playerView` exposes them.
- **runFlipper extraction** — the flipper strategy core is now `runFlipper(state, agent, opts {maxFlips, maxQty, capitalFraction, manageSlots})`; `actPlayer` (scripted) and `actIdlePlayer` (automation, `manageSlots:false`) are thin wrappers. Tier configs in `TUNING.automation.autoFlip` (cadence 8/6/5, flips 1/2/3, qty 6/8/8).
- **Idle gate** — packages/engine/test/automation.test.ts: a tier-1 idle player ends 6k default-world ticks with positive return, hands-free, while *competing against the scripted flipper*. Measured: tier 1 +227, tier 2 +1,769, tier 3 +518 (non-monotonic — see FINDINGS #15; balance pass queued).

## Phase 2b — NPC Ecology + Bot Quality (2026-06-10)

- **NPC bailouts** — `maybeBailout` in packages/engine/src/agents.ts: noise/momentum traders below 20% of starting bankroll get topped back up (ledger mint, "new trader enters"), 500-tick cooldown via `memo.lastBailout`, counted in `stats.npcBailouts`. Tuning under `TUNING.npc`.
- **Producer production burn** — producing costs `baseCost × units` gp, burned via the ledger when affordable (broke producers produce free to bootstrap). This is the sink that tamed the hoard: producer wealth at 100k ticks fell 1.0B → 115M; world gp 1.2B → 325M.
- **Flipper v3** — `actPlayer`: cost-basis tracking in `memo.basis_<item>` / `memo.since_<item>` (bot-local memory); fresh positions never re-list below post-tax break-even `ceil((basis+1)/0.98)`; stale positions (>200 ticks) cut losses at market; up to 2 concurrent flips across distinct items. Flipper profit at 100k ticks: +7,915 → +22,894.
- **Tests** — packages/engine/test/ecology.test.ts: bailout incl. cooldown (losses simulated as ledger burns to keep conservation honest), producer burn incl. broke-bootstrap, basis floor, stale escape, basis cleanup on exit, multi-slot flips.

## Phase 2 — Player Command Protocol + Progression (2026-06-10)

- **Command protocol** — `packages/engine/src/commands.ts`: `applyCommand(state, playerId, cmd)` handles `place` / `cancel` / `buySlot`; `playerView(state, playerId)` returns the plain-JSON player snapshot (gp, slots, inventory copy, open orders, per-item `MarketView` with `bestBidIsMine`/`bestAskIsMine` ownership flags, null-never-undefined). This is the ONLY surface players (bots/UI/server) may use.
- **Slot progression** — `PROGRESSION` in commands.ts: players start with 3 offer slots, max 8; `buySlot` costs 25k/75k/200k/500k/1.25M and **burns** the gp via `ledger.gpBurned` (player-driven sink). Submitting an offer requires a free slot even if it would fill instantly (GE model). `AgentState.slots` (types.ts) is player-only, set in `addAgent` (sim.ts).
- **Flipper rewired** — `actPlayer` in packages/engine/src/agents.ts drives the engine exclusively through the protocol; slot-aware (cancels a listing only when re-listing is guaranteed a slot; skips new flips when full; buys the next slot when gp > 4× its cost).
- **Long-run gate** — `packages/engine/test/longrun.test.ts`: 50k ticks conserved/anchored/profitable + offline-accrual proof (25k + snapshot-resume + 25k ≡ straight 50k, hash-equal). 100k-tick CLI run: 431ms, invariants OK.
- **Tests** — `packages/engine/test/commands.test.ts`: 13 tests (slot enforcement incl. partial-fill rest, unlock schedule + ledger burn, WorldState round-trip with upgraded slots, rejections, view flags, command-driven conservation).

## Phase 1 — Headless Economy Engine (2026-06-10)

Built the complete deterministic sim core. Everything below is new in this phase.

### What exists and where
- **RNG** — `packages/engine/src/rng.ts`: mulberry32 behind the `RNG` interface; `state()` exposes the 32-bit cursor stored in `WorldState.rngState`, so `createRng(savedState)` resumes the stream exactly. `fnv1a` lives here too.
- **World state** — `packages/engine/src/types.ts`: plain-JSON-only shapes. The doc comment at the top of the file is the contract.
- **Order book / matching** — `packages/engine/src/exchange.ts`: `placeOrder` (validate → match against opposing side at resting price → rest remainder), `cancelAgentOrders` (item/side filterable), `createBook`, `bestBid`/`bestAsk`. Escrow rules: buy remainders lock `price*remaining` gp; sells lock items up front; fills debit the incoming buyer at trade price. `paySeller` burns the 2% tax (`GE_TAX_RATE`). Self-trades are skipped in the match loop, never filled.
- **NPC + player bots** — `packages/engine/src/agents.ts`: `actAgent` dispatcher with per-kind cadence; archetypes `actProducer` (cost floor), `actConsumer` (wage faucet, item burn, value ceiling), `actMarketMaker` (EMA-centred quotes), `actMomentum`, `actNoise`, and `actPlayer` — the scripted flipper (buy bid+1 / sell ask−1, 3% min-margin entry filter). **All balance constants live in `TUNING`.**
- **Sim loop** — `packages/engine/src/sim.ts`: `createWorld(config)`, `addAgent` (also the test-fixture entry point — keeps ledger initial totals honest), `tickWorld`, `runTicks`.
- **Conservation checker** — `packages/engine/src/invariants.ts`: `checkInvariants` re-derives gp/item totals from the world and compares against the ledger; also asserts escrow exactness, book sort order, safe integers.
- **Hash / report** — `packages/engine/src/hash.ts` (`hashState` = FNV-1a over key-sorted JSON), `packages/engine/src/report.ts` (`renderReport`, `netWorth`, `wealthByKind`).
- **CLI** — `packages/cli/src/run.ts`: `npm run sim -- --seed N --ticks N [--report-every N]`.

### Test gates (packages/engine/test/)
| File | Gate |
|------|------|
| `exchange.test.ts` | matching, escrow, tax, priority, self-trade skip, cancel refunds |
| `determinism.test.ts` | seed→hash equality; JSON snapshot/restore resumes identically |
| `conservation.test.ts` | ledger balance through 4000 ticks + seed spread |
| `market.test.ts` | 3 seeds × 6000 ticks: prices anchored, volume flows, **flipper profits** |
| `purity.test.ts` | greps `packages/engine/src` for wall-clock/randomness APIs (comments stripped) |
| `rng.test.ts` | determinism, bounds, resume-from-state, uniformity |

### Phase-1 verification numbers (seed 42)
10k ticks ≈ 103 ms; prices settle just above producer cost (e.g. iron_ore 84 vs cost 80); ~35.5k trades; 0 rejected orders; flipper +2,234 gp from 50k start.
