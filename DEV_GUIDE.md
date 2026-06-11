# Dev Guide

## Phase 7b — Staple Volatility Ladder (2026-06-10)

- **genCatalog `tierVolatility`**: staples now ladder 0.08 (<100gp) / 0.09 (<1k) / 0.10 (<5k) / **0.12 (≥5k)**; exotics stay pinned at 0.13. The ladder doubles as the clerk-tier ladder (FINDINGS #41): tier 1 can't reach the dangerous pricey staples, tiers 2/3 own them, humans own exotics.
- Ladder sweep locks: t1 cad 6/v0.10 (min +766), t2 cad 7/v0.12 (min +2,499, medians ~8-9.5k — the ceiling means something again), t3 cad 4→5 (min +6,665; cad 4 was too fast for 0.12 books).

## Phase 7a — Market Navigation at 120 Items (2026-06-10)

- **Track chips** (MarketTable): all / staples / exotics beside the filter (exotic = vol ≥ 0.13, the generator's fixed exotic-track volatility); composes with the text filter and sorting; counter reflects the filtered set.
- **⚡ row markers**: rows with an active world event show a gold ⚡ (tooltip points to the newsbar) — App passes the active-event item set. Ends the scroll-hunt for the event the newsbar named.

## Phase 6z — Catalog 120 (2026-06-10)

- **Catalog 120** (80 staples + 40 exotics). The re-roll broke tiers 1-2 with −10k-class holes (FINDINGS #40 — deeper staple track = pricier items = bigger stale-dump losses). Full three-tier sweep in one ~5-min self-locking script: t1 → cad 6 / vol 0.10, t2 → cad 7 / vol 0.12, t3 unchanged. Vol 0.10 vs 0.12 is currently degenerate (no items in the band).

## Phase 6y — Hidden-Tab Parity (2026-06-10)

- **Hidden ≡ closed** (App.tsx visibilitychange effect): browsers throttle background `setInterval`, so a hidden tab used to tick erratically — slower than the 1 tps offline rate — yet earned no accrual on return. Now: on hide, the run pauses and the save stamps `lastSeenMs`; on show, `beginOffline` accrues (banner, or the chunked overlay for long absences); sub-minute blips silently resume the prior speed (`planOfflineProgress`'s blip filter does the gating).

## Phase 6w — Race Readout & Guide Refresh (2026-06-10)

- **"vs ghost ±N"** in the Fortune legend: `ghostWorthAt` (WorthChart.tsx, exported for tests) linearly interpolates the ghost's worth at the current tick (clamped at its endpoints) and renders a signed, colored delta — the race is readable mid-run. The "what's the grey line" explanation moved to the delta's tooltip.
- **Guide bullet** for the racing loop (HelpOverlay): seeds, ghosts, challenge links. Gotcha: the bullet's bold "challenge link" text collided with the chip in getByText — button queries should use getByRole.

## Phase 6v — Challenge Links (2026-06-10)

- **`#seed=N` links** (parseChallengeSeed in game.ts; boot effect in App.tsx): fresh visitors start that exact seed directly; players with a save get a ⚔ challenge bar (accept = restart on that seed, never a silent clobber). The hash is consumed via history.replaceState so reloads don't re-prompt.
- **"challenge link" chip** next to "new game": copies `…/#seed=<current>` to the clipboard (prompt fallback where clipboard is unavailable), confirms with a toast naming the seed.
- Pairs with phase 6u ghosts: send a friend your seed, both race on identical worlds — "race a friend on fair ground" is now one link.

## Phase 6u — Ghost Runs (2026-06-10)

- **Race yourself on a seed.** `ghostForRestart` (game.ts): restarting the SAME seed stores the abandoned run's worthHistory as `Game.ghost` — best-by-final-worth against any ghost that run was itself racing, so your record run survives weaker attempts. WorthChart draws the ghost as a dim dashed polyline on shared scales with a "grey ghost = your best run on this seed" legend; App only passes a seed-matched ghost. The local, serverless half of the ghost-leaderboards idea — determinism is what makes the race fair.

## Phase 6t — Chunked Offline Catch-up (2026-06-10)

- **The tab no longer freezes on reopen.** `applyOfflineProgress` split into `planOfflineProgress` (computes ticks owed, restamps lastSeenMs) + `finishOfflineProgress` (worth delta, recordWorth); the sync function remains as their composition for small debts and tests. In App, `beginOffline` routes debts ≤ 5k ticks through the sync path and bigger ones through a chunk-driver effect (1k ticks per setTimeout slice) behind a "The world turns…" scrim with a progress bar. Finalize latches news/fills/deeds earned while away, saves, schedules a cloud push, and hands off to the away banner. All three offline entry points (boot, cloud adopt, save import) share it.
- Worst case before: 100k-tick cap ≈ 14s of frozen UI at 100 items (worse pre-6p). Now: same total work, responsive tab, visible progress.

## Phase 6s — Book Cap & Screenshot Refresh (2026-06-10)

- **Resting-order hard cap** (exchange.ts): `MAX_RESTING_PER_AGENT_BOOK = 16` enforced in placeOrder (reject reason `book-cap`). Generous — players are slot-capped at 8 world-wide, no NPC archetype rests more than a handful — and hash-equality at introduction (7f338255/15cacaf8/81d9b0d9 on seeds 7/42/1337) proves it never binds in healthy sims. It bounds book growth against runaway strategies. Closes the last meaty Phase-1 spam-test leftover.
- **README screenshot refreshed** via the SCREENSHOT=1 e2e spec — now shows the 100-item terminal with event chips/countdowns.

## Phase 6r — Many-Seed Robustness Gate (2026-06-10)

- **New gate** (packages/engine/test/manyseed.test.ts): 64 seeds derived deterministically from master seed `0xc0ffee` (zero flakiness), each run 1k ticks → checkInvariants → JSON snapshot → both run 500 more ticks → `hashState` must match → invariants again. Catches seed-specific conservation/determinism violations the 5 fixed seeds can't. ~30s at 100 items — affordable only because of the 6p perf pass. Closes the Phase-1 "property tests" leftover without a fast-check dependency.

## Phase 6q — Catalog 100 (2026-06-10)

- **Catalog 100** (68 staples + 32 exotics; exotic ladder tops at Dragon metal sheet). The re-roll broke tier 2 (competitive seed 11) — routine two-leg sweep relocked it at cad 8 / vol 0.12 (min +3,306); tiers 1/3 held. The whole sweep ran as ONE ~2.5-min command post-6p — re-rolls are now cheap maintenance.
- README "What's in the game" updated (was still claiming 64 items).

## Phase 6p — Engine Performance Pass (2026-06-10)

- **4.5× sim speedup, hash-identical** (FINDINGS #39). Two fixes: `packages/engine/src/items.ts` — `itemDef()` O(1) item lookup via WeakMap keyed on `state.items` identity (used by commands.ts buyRemaining/applyCommand and agents.ts defFor/runFlipper); and runFlipper's re-quote loop now rebuilds `playerView` only after an actual mutation (dirty flag) instead of ~2×items times per act.
- **Perf-change protocol established:** capture `hashState` on seeds 7/42/1337 × 8k ticks BEFORE the change, assert identical after. Identical hashes = identical universes = balance numbers untouched, no sweep. Profile with `node --cpu-prof --cpu-prof-dir=<dir> --import tsx <script>`.
- Suite-time win flows straight to CI (the balance gate was ~95s/scenario locally; now ~20s) and reopens catalog-growth headroom (the cost noted in phase 6o).

## Phase 6o — Catalog 84 & Event Countdowns (2026-06-10)

- **Catalog 84** (56 staples + 28 exotics; exotic ladder tops at Dragon platelegs). The regen broke tiers 1-2 — #37 refuted (FINDINGS #38). Re-swept both legs: tier 1 → cad 7 / vol 0.10, tier 2 → cad 7 / vol 0.12, tier 3 re-verified untouched. Every regen budgets a sweep again.
- **Event countdowns** — newsbar chips show "· N left" (App.tsx) and the ticket shows "⚡ <kind> active — ends in ~N ticks" for the selected item via the new `eventNote` prop (formatted in App, rendered by TradeTicket as a `.warn small` line).
- **Balance gate timeout 240s → 360s** (balance.test.ts): at 84 items each scenario runs ~95s locally ≈ ~190s on ubuntu; 240s was one catalog bump from flaking.

## Phase 6n — Deeds Expansion (2026-06-10)

- **Four new Deeds** (MILESTONES, packages/ui/src/game.ts; now 15 total): `five-million` Gold Baron (worth ladder extension, with progress), `exotic-taste` (hold any vol ≥ 0.13 item), `master-contractor` (10 contracts, progress), `storm-rider` (a personal fill inside an event window — matches `Game.fills` against `world.events`; only live play can earn it since clerks refuse event items).
- No engine changes; MilestonesPanel renders new entries automatically.

## Phase 6m — Catalog 76 & Ticket Warnings (2026-06-10)

- **Catalog 76** (52 staples + 24 exotics; top exotic now Magic sapling). First regen to pass the balance gate with NO sweep (FINDINGS #37) — the vol fences decoupled clerk balance from catalog re-rolls.
- **Ticket advisory warnings** (TradeTicket.tsx): live "· exceeds your N gp" (buy) / "· you hold only N" (sell) hints on the sums line, class `.warn` — deliberately NOT `.reject` (the e2e rejection spec targets `.reject`; reusing it was a strict-mode locator collision, caught by the e2e run) and deliberately NOT disabling submit: the engine stays the authority (slots/buy-limits can reject what the hint can't predict).
- Note: the tax/cost preview this phase originally planned already existed (`.sums` since the max-button phase) — read before writing.

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

- **Offline accrual** — `applyOfflineProgress(game, nowMs)` in packages/ui/src/game.ts: 1 tick/sec of real time away (cap 50k ticks ≈ 14h at the time — later raised to 100k ≈ 28h, <60s ignored), clock injected for testability; `saveGame` stamps `lastSeenMs`. App shows a dismissible "while you were away" banner with ticks + worth delta.
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
- **The human is an idle-policy player** (packages/ui/src/game.ts `newGame`): engine-inert until automation is purchased, acting via `applyCommand` from click handlers — the same surface as every bot. Starting purse 30k gp at the time (now 55,000 per Jesse).
- **Game loop lives in the page** (App.tsx): `setInterval` ticks the world at 0/1/5/20 tps (starts paused); fast-forward buttons call `runTicks(1k/10k)` instantly. Save/load = localStorage JSON snapshot (`SAVE_KEY`); new-game bumps the seed.
- **Components** — MarketTable (row click loads ticket; ◆ marks your best offers), TradeTicket (bid+1/ask−1 helpers, post-tax math, engine rejection reasons), PlayerPanel (inventory @ last, open offers with abort), UpgradeShop (slots + autoFlip tiers, affordability-gated).
- **Tests** — packages/ui/test/app.test.tsx (jsdom): 6 flows through the REAL engine — render, place (escrow assert), abort (refund assert), reject reason, fast-forward determinism, upgrade gating.
- **Aesthetic (provisional)** — "medieval trading terminal": iron/stone/parchment/gold, Cinzel + IBM Plex Mono, green/red sides, staggered panel rise. Jesse steers from here.

## Phase 3 — Workspace Split (2026-06-10)

- **npm workspaces** — `packages/engine` (`@exchange-wars/engine`: all sim code + the test suites — 11 at the time, 14 as of phase 6r) and `packages/cli` (run.ts, balance.ts importing the package). Engine exports `./src/index.ts` (a barrel — the ONLY entry other packages may import); no build step, tsx/vitest consume TS directly.
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
