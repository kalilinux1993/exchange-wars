# Dev Guide

> **Consolidated record: complete (Phase 1 → 18m).** The whole autonomous build loop is now folded into the
> sections below (newest-first); per-brick detail lives in `.phases/` + FINDINGS. The former 10h–13c gap was
> closed in 16h. Engine-redeploy obligation still open: the `verify-score` batch `12b+13d+13e+13f+13r+14j`
> (Jesse-gated on `SUPABASE_ACCESS_TOKEN`).

## Phases 17w–18m consolidated — the see→act actionability arc completed, momentum + leaderboard + book-hygiene readouts, 2 reviews (1 caught real bugs) (2026-06-13)

Per-brick detail in `.phases/` and FINDINGS #285–#301; 17 bricks. **UI-only, ALL of it** — no engine change, so the `verify-score` batch is unchanged. Suite grew 420→444 unit + 11 e2e (a real-browser resting-confirmation colour e2e added 18k). Two adversarial reviews: 18b (17w–18a) **SOUND**; 18g (18c–18f) found 18c/18d/18f SOUND but caught 18e shipping a wrong gate AND a test that ratified it, plus a pre-existing `deathRecap`↔engine desync — all fixed (the review that earned its keep).

### The see→act actionability arc, completed across all four "states-a-fact" surfaces
A surface that NAMES something to do should TAKE you there. Each reuses an existing jump (`onSelect`→load-the-item, or `jumpToRegion`→region-nonce-pulse + `pickRoom('adventure')`): **event chips** (15l, prior) → **contracts** "buy {shortfall}" loads the item into the ticket (17y) → **bounties** "hunt" jumps to the target's region (18f, via `huntRegionId` — the id-returning sibling of `monsterRegions`) → **ticket farm line** "hunt" jumps to a drop-item's source region (18m, reusing `itemSources.regionId`). `jumpToRegion` is now a 3-caller primitive (Delve-Log raid-again 12l, 18f, 18m). FINDINGS #287/#294/#301.

### Momentum tooling — the fourth decision axis gets its track
`momentum(last, ema)` extracted to game.ts as the single source (the mom column's sort + cell + a new track — the third inline copy was the extract trigger) (17z). A `movers` filter track (`|momentum| ≥ 0.05`) surfaces what's dislocated from EMA — empty in the calm baseline, lit by events; completes the momentum axis (column 17o → track 17z) matching volatility's (read→column→track). FINDINGS #288.

### Leaderboard summit + bounty location
`gapToTop(rows, meRank)` (mirrors `rankGap`'s guards/tie-floor) + a "👑 {gap} gp behind #1" line gated to top contenders #3–#10 (at #2 it duplicates the rank-above gap; below #10 the leader isn't a live target) — two distinct climbs: the next rung + the peak (18a; the gate pinned by a #2-suppression render test added in 18b). Bounties gained their WHERE first: a region suffix via `monsterRegions` (17x). FINDINGS #286/#289/#290.

### Adventure risk⟷reward depth
The combat foe's drop list inline (risk⟷reward in the fight, 17w). A loadout `⚠ understocked` flag — `loadoutShort` surfaces exactly what `applyLoadout`'s silent clamp would drop (18c). An in-dive death-stakes line — `deathRecap` rendered BEFORE death ("⚰ if you fall: lose {gp} + N items · keep {best}"), the consequence half of the push-vs-bank call (18e). Review 18g then fixed 18e's gate (carried gear is at risk pre-kill, not just loot gp) and threaded `keepN` so `deathRecap` honors the Death Ward upgrade (engine keeps 5, not 3) in BOTH the preview and the death toast — a display↔arbiter desync that predated 18e. FINDINGS #285/#291/#293/#295.

### Feedback loops + book hygiene
The third order outcome confirmed: `ok && no trades` → "✓ placed — resting on the book" (lastResult tagged with its command, `{result, cmd}`, so a cancel/claim doesn't false-fire, 18h). Open offers show "rested {N}t" + a ⏳ `.stale` flag past 500 ticks — `orderAge` reads the placement `Order.tick` from `world.books` (the view projection drops it; the UI reads state for display), dead-capital triage with no engine/view change (18i). FINDINGS #296/#297.

### Progression, onboarding, visual coherence, watchlist
Skill tooltips quantify the XP bar ("Attack 40 · 62% to 41 · 1,240 xp to go", maxed→"maxed (99)") (18j). The How-to-Play guide refreshed to match shipped features — momentum sort, movers filter, compact toggle, Adventure ←/→/Enter — pinned by new assertions against drift (18d). The session's new feedback classes (`.resting`/`li.stale`) styled with theme tokens, verified by a real-browser e2e `toHaveCSS` (18k). The watchlist floats a fired alert to the top (stable sort → meaningful motion, not tick jitter), completing alert→SEE→act (18l). FINDINGS #292/#298/#299/#300.

## Phases 16w–17v consolidated — elite arc, dive-readiness, the four decision axes, watchlist + goal systems, keyboard loop, 3 reviews (2026-06-12)

Per-brick detail in `.phases/` and FINDINGS #258–#284; 26 bricks. **UI-only, ALL of it** — no engine change, so the `verify-score` batch is unchanged. Suite grew 359→420 unit + 10 e2e (a compact-columns e2e added 17r). Two whole-tab VISUAL assessments (#278: Exchange; 17v-era: Adventure) confirmed no layout regression — the check a green suite can't run. Three adversarial reviews (17i 16w–17h, 17p 17i–17o, 17v 17q–17u) all **SOUND**; each closed a tiny finding (a hoisted compute gated below an early return 17i; an orphaned `ew-goal-hit` reset 17p; Escape gated on help-open 17v).

### Elite arc (16w · 16z · 17b)
`ELITES` (the named-boss roster from MONSTERS) + `newElites(slain, kills)` (pure — elites with a kill not yet in a baseline Set) drive a "☠ {elite} falls!" first-kill salute, baselined on boot/swap so prior/offline kills stay silent (16w). `apex-predator` MILESTONE (`ELITES.every(kills>0)`) + a gold-bordered "☠ Named Elites N/4" ConquestPanel strip collect the four scattered bosses (16z). `dragon-slayer` re-keyed from `itemsMinted['superior_dragon_bones']` (a PRODUCER mints those within ticks → the deed auto-fired) to `DRAGON_IDS.some(killsByMonster>0)` (17b) — found by forcing 17a through real ticked state. FINDINGS #258/#261/#263.

### Dive readiness, text → map (16x · 17g · 17i)
`diveReadiness(you, frontier)` (ExpeditionPanel, pure — the deepest unlocked region you're favored to farm vs its `regionTypical` foe; unlock ≠ ready) → a "✓ ready / 📍 safe depth is {region} / ⚠ outmatched" embark line (16x), with the recommended node ringed green on the RegionMap (17g, computed once + shared). 17i hoisted that compute BELOW the EmbarkPanel early-return so it's free while diving. FINDINGS #259/#268/#270.

### The four trading decision axes — sortable columns, by construction
Each a sortable MarketTable column + (mostly) a filter track, all over data already in the view: **margin** (profit, 14d) · **band** (value, 15q) · **swing** (risk, `priceSwing` column 16y + a "steady" track 17h) · **mom** (direction, `(last−ema)/ema` 17o). Plus filter tracks `watched` (17f) and a CSS-`nth-child` `compact` toggle (17r) hiding the four lens columns; `/` focuses + `Esc`/✕ clear the filter (17n/17s); help + chip tooltips teach them all (17j). FINDINGS #260/#267/#269/#276/#280/#281.

### Watchlist arc: add → see → focus (17c · 17d · 17f)
`w` toggles the watchlist on the selected item (MarketTable keydown, navRef-fresh) (17c); a per-row gold ★ shows the state inline (17d); a `watched` filter track collapses the market to it (17f). The `watched` Set threaded in 17d unlocked the track for one predicate line.

### Goal system on three surfaces (17k · 17l · 17m · 17p · 17t)
`deedEta(progress, worth, perMin)` recovers a worth deed's threshold from its raw progress → an ETA beside the bar (gated by a `paceMetric:'worth'` tag, 17k). `goalView(goal, worth, perMin)` + a settable/clearable WealthPanel target (`usePref('ew-worth-goal')`, 17l), a one-shot "🎯 Goal reached!" toast guarded by a persisted `goalHit` (17m; reset on clear 17p), and a teal dashed target LINE on the Fortune chart (WorthChart reads the goal live from localStorage, range-folded when `goal ≤ dataMax*3`, 17t). The same worth-rate projection (11w) now feeds round-number, deed, and custom-goal ETAs. FINDINGS #272/#273/#274/#277/#282.

### Retention, events, keyboard, pacing
`awayDeeds` surfaces deeds crossed during offline accrual in the away-bar (17a, pre-accrual latch so pre-gap deeds aren't miscredited — the same find that exposed dragon-slayer). `eventEndingSoon(ticksLeft)` (≤150) marks a closing event chip amber+⏳, completing the lifecycle begin(15l)→ending(17e)→end(15z). Keyboard: the trade loop is `/` find → j/k walk → b/s side → Enter submit → w watch; `,`/`.` step world speed via `stepSpeed` (17q); `Esc` clears a focused filter (17s) else dismisses the help modal (17u/17v) — the App input-guard routes the same key by focus context. FINDINGS #262/#266/#275/#279/#283/#284.

## Phases 13z–16b consolidated — value-band suite, adventure risk⟷reward, atmosphere, lifecycle recaps, leaderboard (2026-06-12)

Per-phase detail in `.phases/` and FINDINGS #190–#241; ~50 bricks. **UI-only EXCEPT 14j** (`netWorth` now counts equipped gear at liquidation value — already in the pending `verify-score` redeploy batch `12b+13d+13e+13f+13r+14j`); every other brick is display/notification logic over `applyCommand`, no engine change. All new pure helpers live in `packages/ui/src/game.ts` and are unit-pinned in `packages/ui/test/app.test.tsx` (suite grew ~340→359).

### Threat-surfacing arc (13z–14c) — know-your-enemy across all three reads
Foe ⚔/🛡 danger-coloured vs your effective stats + 🔥 dragonfire in the live combat readout (13z); a "💧−N gp/round" leech marker on the combat foe line (14a) and surfaced pre-embark in `regionDanger.leech` (14b); met-monster Bestiary rows show ⚔/🛡/hp + 💧leech (14c). The embark-decision triad (danger ⟷ battle power ⟷ rounds forecast) + the in-fight push/flee read are complete (FINDINGS #190–#195 era).

### The value-band suite — one fundamental signal, six surfaces
`valueBand(def, lastPrice)` → cheap/fair/rich (extracted from the ticket's inline cheap/fair/rich as the single source, 15f) over `bandPosition(def, lastPrice)` → the clamped 0..1 fraction (extracted 15q so a glance and a sort can't disagree). Surfaced on: a "cheap" MarketTable track (15f); the `marketMood(markets, items)` breadth line (15g); the WatchlistPanel decision row (15i, with `flipMargin` also extracted to game.ts as the single source for the market column + watch row); the Open-Positions band tag (15o); a **sortable** MarketTable band column (15q); and as an active signal — `bandAlertHit` → a threshold-free "buy the dip" alert (15s, a `bandAlerts` pref + 🟢 watch toggle, copying the price-alert one-shot/re-arm pattern). FINDINGS #228–#232, #237's "personalization is a filter" cousin.

### Adventure risk⟷reward + the trade↔farm link
- **Embark loot upside** (15u): `regionLoot(roster)` → gp/kill range + distinct drops at best chance — the REWARD half beside the danger read (the forward complement to 15c's historical `raidTotalsByRegion`). Scoped to an honest range+list, NOT a speculative EV (FINDINGS #234).
- **Wounded nudge** (15w): the embark forecast runs at full hp, but you can embark hurt out of a prior dive — a "⚠ you're at {hp}/{max} hp — you'll dive hurt" warning + a one-tap rest-to-full (reuses `healEta`/`REST_REGEN_TICKS`/`onRest=fastForward`; the embark twin of the mid-dive push-read 13p). `agent.hp` defined = wounded (engine deletes it at full). FINDINGS #236.
- **Item→source index** (15v): `itemSources(itemId, monsters, regions)` reverse-indexes the drop tables (monster→region via `region.monsters`/`elite`) → a "🗡 farm: {monster} {chance}% · {region}" ticket line, gated to drop-items. Closes the trade↔farm cross-reference both ways (15u region→items, 15v item→region) off one table indexed twice (FINDINGS #235).

### Per-region atmosphere arc (combat → map → embark)
`arenaTheme(regionId)` (CombatScene, 14u) tints the combat backdrop; carried to the RegionMap node halos (15t, an additive `.maphalo` element behind the state-coloured circle so cleared/frontier/locked coding survives) and the embark `.region-readout` (15y, a transparent tinted wrapper around the danger/loot/forecast block; hex8 low-alpha for legibility). All three adventure surfaces now share green-plains→ember-Maw→void-Abyss. FINDINGS #233, #238.

### Lifecycle recaps + personal feedback
- **Extract recap** (15n): a "🎒 Returned from {region}" toast on a clean extract — the positive close to the death recap; ordered before `onDelveEnd` so a record haul's "New best haul!" wins.
- **Event-end recap** (15z): `reconcileEvents(captured, activeNow, priceOf)` — a pure set-diff that captures each event's price when it goes active and recaps the move when it ends (App holds the map in a ref, swap-guarded); closes the event lifecycle the 15l chips open (FINDINGS #239).
- **Away held-mover** (15x): `heldMover(before, markets, inventory)` = `biggestMover` over the held subset → a "💼 your {item} ±X%" away-bar line, deduped vs the market `topMover` — personalization via a filter (FINDINGS #237). Away-FILLS stay engine-gated (the 512-trade window evicts them, 15q investigation).

### Pre-trade risk + retention/celebration
- **Buy concentration** (15r): `buyConcentration(view, itemId, addCost)` → after-fill "{item} ≈ X% of holdings ⚠"; worth = cash + held goods, UNCHANGED by a buy (a swap), so it's the exact denominator (FINDINGS #231). Reuses the PositionsPanel risk thresholds.
- **Celebration swap-guard class** (14e/14f): mount-lazy baseline refs (level-up, daily-record) re-baseline on a game/agent identity change so adopting a higher save doesn't fire a false celebration — the reflex now applied to every cross-tick ref: region-unlock (15h), streak (15m), best-haul (15e, detected at the `onDelveEnd` append point — no ref needed), and the event-capture ref (15z).

### Leaderboard — a two-tense competitive board (Phase 16)
`rankGap(rows, meRank)` → gp + handle of the rank directly above your SUBMITTED score (16a); `provisionalRank(rows, myWorth)` (`>=` so a tie sits below the incumbent) → a LIVE "if the sprint ended now you'd sit #N", gated to `tick < SPRINT_TICKS` where current worth honestly equals a sprint score (16b). Where you ARE + where you're HEADED. First leaderboard touch since 11q's `myRank`. FINDINGS #240/#241.

### Maintenance + a logged robustness gap
- **Citation audit** (15p): the codebase's one source-comment file:line citation (`game.ts` → the engine damage formula) had drifted `quest.ts:394→407`; fixed + re-verified `expectedHit` still mirrors `damage()`'s mean. Historical FINDINGS citations left as point-in-time records (FINDINGS #229).
- **Stale `monsterById` (found 15t, NOT fixed):** `monsterById(id)` throws on an unknown id (`quest.ts:374`); persisted state (`exp.combat.monsterId`, a bounty's `monsterId`) could carry an id a later engine version removed, and the engine TICK calls it during combat resolution too — so a UI render-guard alone is insufficient. Clean fix = load-boundary quarantine in `normalizeGame` (engine-touching → Jesse-gated). Realized probability ~nil today (content has been additive). → NEXT_STEPS robustness, FINDINGS #233.

## Phases 13d–13y consolidated — equipment manager + decision-support polish + RPG juice (2026-06-12)

Per-phase detail in `.phases/` and FINDINGS #168–#189; ~22 bricks + 2 adversarial reviews. Triggered by a user bug report ("manually-bought gear gets sold by the clerk; the satchel never changes; let me equip like OSRS"), then a feature-complete game's decision-support and juice were rounded out. **Everything after 13f is UI-only** (no engine change) by deliberate design, since the one Jesse-gated `verify-score` redeploy was unavailable in the loop.

### Engine additions (replay-affecting → redeploy batch 12b+13d+13e+13f+13r)
- **Clerk gear-safety** (13d): the autoFlip clerk shares `agent.inventory` with the player and was selling gear the human bought to equip. Fix gates clerk sell/buy on the cost `basis` it records for its own stock — a held item with no basis was bought by the human (FINDINGS #168). Sim byte-identical (clerk only ever holds basis-bearing buys).
- **Equipment manager** (13e): `AgentState.worn` per slot + `equip`/`unequip`/`equipBest` commands (inventory↔worn moves, conservation-counted in invariants.ts, level-gated, rejected mid-expedition). `deriveStats(pack, lvls, worn?)` — worn OVERRIDES the pack per slot; **absent `worn` = byte-identical old behaviour**, so every expedition test and the benchmark are untouched and the sim hash is unchanged (FINDINGS #169/#170). Worn gear is NOT in the at-risk pack → safe on death.
- **`equipBest` tie-break** (13r, review-driven): the three "best gear per slot" pickers (`deriveStats`/`equipBest`/UI `equipped()`) broke stat-ties by different iteration orders; `equipBest`+`equipped()` now resolve by smaller itemId (order-independent). Cosmetic only (tied pieces are stat-identical), but the lying "identical tie-break" comment was the real hazard (FINDINGS #182).

### UI — equipment surfaces (no engine change)
- **Paperdoll coherence** (13g): CharacterPanel's `equipped()`/`deriveStats()` now factor `agent.worn`, so the Adventure figure + "in battle" stats reflect ACTUAL equipped gear, not a satchel-best preview that disagreed after equipping (FINDINGS #171).
- **Gear deltas at the decision point**: a satchel upgrade badge (`gearDelta`, 13h), the same delta on the buy ticket BEFORE purchase (13i), and a ⚔/🛡 marker + "gear" track filter so gear is findable among 128 commodities (13j). The buy-gear arc end-to-end: find → preview → compare → equip (FINDINGS #172/#173/#174).

### UI — decision-support lenses (the session's two themes)
- **Affordability** (info the data CAN prove, never a realizable-profit claim): `flipAffordability` ×N badge + "fits purse" filter + "GE-capped" marker on TopFlips (13l/13t), underwater-positions glance on PositionsPanel (13n), "need +X" shortfall + purse on UpgradeShop (13s), return-on-stake badge on WealthPanel (13k). FINDINGS #173/#176/#178/#183/#184.
- **Signal-on-the-control → readout-then-action**: gear delta ON the buy ticket (13i), banked-loot payoff ON the extract button (13o), red tint ON the price field below break-even (13q); then the dive-decision triad — embark forecast (full hp) → mid-dive push read at CURRENT hp (13p) → rest heal-ETA between dives (13x) — and the action beside each readout: "rest to full" one-click (13y). FINDINGS #179/#180/#181/#188/#189.

### UI — trading review + RPG juice
- **Recent flips** (13u): `recentFlips` re-runs the FIFO match over the fills window (same tax as `applyFillToBook`) to keep per-flip detail the lifetime book aggregates away, as a 3rd TradeFeed mode (tape/mine/flips) — completing acquire→risk→review (FINDINGS #185).
- **Level-up feedback** (13v/13w): `leveledUp` diff-detection → an "⚔ Attack up!" toast (lazy-init ref, below deeds in the toast-priority order) + a gold skill-cell flash; toast says what, flash says where (FINDINGS #186/#187).

### Reviews (2 adversarial passes)
- **Equipment consistency** (pre-13r): three best-per-slot pickers — found the tie-break divergence (→13r); conservation/determinism/fallback/invariants all SOUND.
- **Money helpers** (pre-13t): `returnOnStake`/`flipAffordability`/`underwaterSummary`/`gearDelta` — verdict SOUND (no sign/tax/edge bugs); one latent flag tightened + surfaced (→13t).

## Phases 10h–13c consolidated — RPG content, the trading-cockpit build-out, embark/HUD decision-support, daily-social (2026-06-12, retro)

Per-phase detail in `.phases/` and FINDINGS #94–#167 (~30 bricks). Reconstructed from the records (this arc predates the autonomous-loop session), so it cites FINDINGS#/symbols rather than over-claiming line detail. Engine changes here went through `verify-score` redeploys in-phase EXCEPT the 12b batch (still pending). NB: FINDINGS numbers ≠ brick labels (separate counters); #117/#119/#122 (Field Forge/Skarn/Blood Altar) were branch-numbered and are described in the #140 merge finding.

### Engine additions (replay-affecting)
- **Region Mastery** (10i, #95): one-time combat-XP bounty (`40 + 30×depth`) on first frontier clear, hung off the `questProgress` advance branch — XP-only, conservation-clean.
- **Sellsword haul counters** (10k, #97): `stats.sellswordKills`/`sellswordBanked` written in `tickWorld` (worth-neutral; bundle changed → redeployed).
- **Goading potion** (10n, #100): +10 atk/dive `CONSUMABLES` line (offensive twin of divine bastion).
- **12b content batch** (#140, PR #1 `--no-ff`): **Field Forge** (burn 300gp → +8 atk/dive), **Skarn** elite in `wilderness_ruins`, **Blood Altar** (hp→atk). **verify-score redeploy PENDING** (the batch the header tracks). Elite placed in barely-tested region 4 to dodge the seed-path blast radius (see Patterns).

### UI — the trading cockpit (the P&L arc 11b→11p)
- **Suggested flip** (10j, #96) + **Best Flips Now** `rankFlips(markets, tax, n)` (10v, #108): the flipper's core sum surfaced + ranked across every book; tax a parameter for purity. **One-click flip** prefill (11d, #116). **Flip roi/limit** on rows (11c, #115 — refused to sort on an unverifiable realizable-units guess).
- **Fair value band** (10m, #99): `lastPrice` in `[baseCost..consumeValue]` → cheap<34%/fair/rich>67% (rich=GOLD, a sell-op isn't bad) — the seed of the value-band suite later generalized in 15f.
- **Lifetime trade book** (11o, #127): persistent `TradeBook` (FIFO lots + realized-per-item) accrued fill-by-fill in `recordFills`; `applyFillToBook` the single FIFO truth; `realizedPnL`/`openPosition` (11b/11i, #114/#121) reimplemented as wrappers. On `Game` not `WorldState` (determinism untouched); `normalizeGame` rebuild migration. **Scorecard** `totalRealized`/`totalUnrealized(priceOf)` (11p, #128).
- **Open Positions** `heldPositions(book, markOf)` (12c, #141) + **concentration** `positionConcentration` (12k, #149) + **wealth composition** (holdings = total−cash−buyOrders, 12m, #151). **Average-down** `blendBuy` (12d, #142), **break-even** `breakEvenSell` (ceil(avg/(1−tax)) then tighten down for floor-tax, property-tested, 12h, #146), **flip consistency** `tradeRecord` (12n, #152). **Liquidity bar** `depthSplit` (11f, #118). **Sell-above alerts** unified via `alertHit(last, threshold, dir)` (12a, #139). **Contract premium / bounty bar** (11y/11z, #137/#138).

### UI — RPG / adventure + HUD (the embark-decision arc)
- **Danger reads**: `regionDanger(region)` worst-case foe (11l, #124); effective stats via the engine's `deriveStats` (11m, #125); per-axis red colouring (11n, #126); **train-to-unlock** `lockedUpgrades` (10w, #109).
- **Forecast**: `combatForecast`/`expectedHit` (≈rounds-to-kill vs -to-fall off the RNG damage MEAN; `favored = roundsToKill <= roundsToFall`, player strikes first; the `expectedHit`↔`quest.ts` duplication paid down with sync-comment+pinned tests+≈framing — the citation later audited in 15p) (12j, #148); live in-combat variant w/ dragonfire `foeHitBonus` (12o, #153); **embark prep** `embarkPrep` (inspects the DRAFT, food gated on `!favored`) + one-click fix chip (12p/12q, #154/#155).
- **Delve Log** `DelveRecord` latched on the exp present→absent transition (12i, #147), "raid again" nonce-pulse (12l, #150), **region conquest** `regionRoster`/`regionMastery` 👑 (12f, #144), `raidTotals` by outcome (12s, #157). **Bestiary/combat art** unified in `MonsterBody`/`MonsterGlyph` (10p, #102); **item icons** `itemIcon(id)` category-map (10o, #101). **Timestamped deeds** + Fortune-curve dots via `ghostWorthAt` (11s/11t, #131/#132); next-deed bars (12z, #164). **Adventurer's Record** `recordRows(stats)` (10z, #112).

### UI — daily / social
- **Daily seed** `dailySeed()` (UTC YYYYMMDD, 10q, #103) + "🗓 today" pill (10r, #104) + **streak** `bumpStreak`/`streakAtRisk` (pure, day injected, 10s/10t, #105/#106) + **daily best** `recordDailyBest`/`dailyBestView` (12e, #143) + new-record celebration (12w, #161). **`myRank`** by sanitized handle (board exposes only handle/worth/deepest, 11q, #129) + daily-board framing (11r, #130).

### Robustness / patterns / gotchas (the recurring lessons)
- **Corrupt-save recovery** (10u, #107): quarantine was only half — a red recovery bar hands the bytes back (`loadCorruptSave`/`discardCorruptSave`).
- **Deterministic-engine blast radius** (12n, #152): "additive" content rarely is — a `region.elite` inserts an `rng.chance` into `rollEncounter`, reordering every fixed-seed assertion downstream; cost ∝ how heavily the touched seed-path is asserted, not diff size. 12b dodged it by region placement.
- **Detection-in-a-shared-slot** (12x/12y, #162/#163): the sellsword shares `agent.expedition`; the Delve Log effect reanimated a latent toast mis-attribution — fix one consumer, audit ALL; aim reviews at the failure CLASS (effect lifecycles), not arithmetic. **Resting-fill notify** (13b, #166) was 80% spam-suppression (1×-gate + skip-command-path + fire-FIRST so milestone/alert toasts override — the toast-priority discipline later corrected wholesale in 16e). `fillToastFlavor` names-when-homogeneous (13c, #167).
- **All-rooms-mounted locator collisions** (#147/#150/#128): tab-hidden rooms stay in the DOM → loose `getByText` cross-matches; target by unique title/distinctive label. **jsdom has no layout** → explicit `active` props over `offsetParent` (12g, #145) + `typeof scrollIntoView` guards (12v, #160). **Gated-window-listener** (`active` prop + state-via-ref) reused near-free for ticket hotkeys (12g→12t, #145/#158). **SVG transform on OUTER `<g>`** / `.equipval` class over `:last-child` (10w/10p, #109/#102). **Optional new fields = no migration churn** (11s vs 11o). **A "SOUND" adversarial review is evidence, not waste** (12u, #159). **Consolidation cadence**: ~16 feature bricks then a librarian brick (10h, #94).

## Phases 9y–10g consolidated — content, trading depth, polish (2026-06-11)

Per-phase detail in `.phases/` and FINDINGS #85–#93; the ~9 bricks since the 9g–9w map.

### Engine additions (all replay-affecting → verify-score redeployed in-phase)
- **Combat brews** generalized the dive-long flag (already in 9v); **courier** event (10d) — the 8th event face, the first to bend RISK: ships `COURIER_FRACTION` (0.5) of loot gp to the death-safe `agent.gp` for a `COURIER_CUT` (0.2) burned. The 8 faces (shrine/gamble/imp/portal/merchant/spar/toll/courier) each bend a distinct system (FINDINGS #64/#90).
- **Death Ward** (10e): `PROGRESSION.upgrades.deathWard` [100k] → `expeditionDeath` keeps `DEATH_KEEP_WARDED` (5) not 3. buyUpgrade is generic, so a new upgrade is ~3 lines. A deep gp sink that aids raiding, tying the halves.

### UI (all SVG/CSS, no engine change)
- **Combat scene maturity**: monster archetype silhouettes (10f's `FighterKit` per-slot figure too) — ooze/drake/brute/critter by leech/dragonfire/hp (9y); the fighter lights helm/body/legs/weapon/shield from the pack's usable gear, mirroring the paperdoll (10f). Positioning transform on OUTER `<g>`, bob on INNER (CSS clobbers SVG attr — #78).
- **Trading cockpit**: MoversPanel + WatchlistPanel + **price alerts** (10b: latched buy-below threshold via a `fired` ref, detection in refreshProgress not render) + **market pulse** in the masthead (10a: breadth ▲/▼ + ⚡events) + Sparkline + **abort-all** offers (10g: latent `cancel`-with-no-args exposed).
- **Equip discoverability** (9z): "Pack & Equip" + ⚔ equip-best button + Ledger pointer — the implicit "packed gear is auto-worn" mechanic made visible (recurring UX lesson with #69: implicit systems need a named verb + one sentence, never new mechanics).
- **usePref** (10c): `usePref<T>(key, fallback)` hook collapses the JSON localStorage prefs (loadouts/watch/alerts); title (raw string) + room (validated enum) stay bespoke.

## Phases 9g–9w consolidated — the OSRS-HUD + trading-tools arc (2026-06-11)

Per-phase detail in `.phases/` and FINDINGS #67–#83; this maps the ~17 bricks since the 8h–9f consolidation. Jesse steered mid-arc toward an OSRS interface (map, player model, shorter deeds) and open-licensed art.

### Engine additions
- **combatLevel(xp)** (quest.ts): pure derived 1→99 (floor((atk+def+hp)/3)); display-only, no replay impact (FINDINGS #76).
- **Combat brews** (FINDINGS #82): ConsumableDef.boostAtk/boostDef + ExpeditionState.boost — a dive-long stat buff reusing the antifire flag SHAPE (divine_bastion_potion_4 → +10 def/dive); applied in the command layer (runCombatRound), NOT deriveStats (that pure fn feeds gear-only UI). Replay-affecting → redeploy.
- **Bounty board** (sim.ts spawner on a derived stream + claimBounty command, stats.bountiesClaimed); **Sellsword** (actSellsword in tickWorld — expedition autopilot; expedition logic was REFACTORED into shared helpers rollEncounter/runCombatRound/beginExpedition/finishExtract so command + autopilot share one source of truth, FINDINGS #68).
- **stats.deaths** + death recap data.

### UI: the OSRS HUD (all SVG/CSS, no art deps)
- **RegionMap** (node-graph trail, locked/frontier/cleared/selected, ★ elites), **CharacterPanel** (paperdoll lit per best-usable-gear-per-slot + skills strip + combat level + earned-deed **title** selector), **CombatScene** (figure vs id-generated monster, hp bars, render-diff hit-splats — animation via React keys, never engine timers; positioning transform on an OUTER `<g>`, bob animation on INNER `<g>` because CSS transform CLOBBERS the SVG attribute, FINDINGS #78).
- Trading tools: **MoversPanel** (hot/cold vs EMA), **WatchlistPanel** (starred items, localStorage), **Sparkline** (ticket price trend from state.trades), **Almanac** (ledger/stats reader).
- Deeds compacted to a badge grid + top-3-closest inline.

### Robustness (Jesse-asked)
- **ErrorBoundary** wraps App — catches render crashes, save-safe recovery card (FINDINGS #75).
- **loadGame** shape-gates + QUARANTINES an unreadable save to `<key>-corrupt` instead of letting the first autosave destroy it (FINDINGS #77).

### Art pipeline (FINDINGS #73/#74)
- `Icon` auto-discovers `src/assets/icons/<name>.svg` via import.meta.glob, emoji fallback. Drop a file → it appears. WebFetch CANNOT auto-pull game-icons (markdown-converts, strips SVG paths) — populate by Jesse dropping files or hand-authoring originals. CREDITS.md tracks CC BY / CC0 / original; NO Jagex/OSRS or CC BY-NC-SA art.

### localStorage UI-prefs (4, same load/save+try/catch shape; candidate for a `usePref` helper): `ew-room`, `ew-title`, `ew-loadouts`, `ew-watch`.

### Operational law added: round-number brick = consolidation (FINDINGS #67).

## Phases 8h–9f consolidated — the RPG layer as it stands (2026-06-11)

Per-phase details live in `.phases/` and FINDINGS #42–#66; this is the map of the system AFTER 25 more bricks.

### Engine (packages/engine/src)
- **quest.ts is the RPG core**: 8-region ladder (`REGIONS`, plains → The Abyss; per-region `elite` field — NEVER pin anything to `length-1`, see FINDINGS #54), 12-monster bestiary + 3 named elites (Vorkanth/Zukrath/Vessith), `dragonfire` (armor-piercing +ceil(atk/2), negated ONLY by antifire — the flag lives on ExpeditionState for the whole dive) and `leech` (loot-gp drain per dragging round, burned) monster mechanics, 20-item gear ladder with `req` levels (weapons→Attack, armor→Defence; under-leveled gear is INERT in `deriveStats`), stats/xp (`levelFor` sqrt curve cap 99; atk=dmg dealt, def=dmg taken, hp=ceil(dealt/3); `maxHpFor` = 50+2/lvl), wounds (`REST_REGEN_TICKS` out-of-field regen; death → 1 hp), 7 choice-event kinds (shrine/gamble/imp/portal/merchant/spar/toll), supplies-only `CACHE_LOOT`.
- **commands.ts player surface** (the ONLY mutation path): market commands + `startExpedition/advance/fight/fleeCombat/eatFood/choose/extract/claimBounty`. Advance and every combat round cost a WORLD TICK (`tickWorld` inside the case — FINDINGS #45); camp meals (eat out of combat) cost one too. Validation-first discipline: rejected commands must be tick-free no-ops in every branch (FINDINGS #61).
- **sim.ts**: out-of-field hp regen to trained max; **bounty spawner** on a DERIVED rng stream (`expeditionSeed(seed, 0x42000000+tick)` — zero world-cursor draws, so new spawners never re-roll the universe, FINDINGS #66).
- **report.ts netWorth is LIQUIDATION value**: walk resting bids excluding the agent's own (self-bid pump guard), remainder marks 0 (FINDINGS #49). The UI's `playerWorth` and the verify-score arbiter are this same function.
- **replay.ts**: SPRINT_TICKS=2_000 (Edge CPU budget, FINDINGS #42); command-driven ticks replay correctly because recorded ticks fully determine application order.

### UI (packages/ui)
- **Three rooms** (FINDINGS #60): 🪙 Exchange / ⚔ Adventure (live ● pip while afield) / 🏰 Hall; all stay MOUNTED, inactive hidden via `.tabhidden` class; room persists in `ew-room`.
- Adventure: ExpeditionPanel (regions/pack/combat with **fight it out** auto-resolve that hands back control below 25% hp without food / Bestiary codex), BountyBoard, Deeds. Exchange: market/ticket+ladder/Ledger with **sell @ bid** chips (`bidWalk` floor-price dumps — instant fills, no residue). Hall: Clerk's Counter, Fortune, Almanac, Sprint Board.
- Death recaps via last-render snapshot + `deathRecap` (mirrors the engine keep-3 rule; FINDINGS #62).

### Operational laws (earned the hard way)
1. Any engine change that affects replays ⇒ `npm run build:fn` + redeploy verify-score in the SAME phase.
2. Any countable a player-facing surface quotes (sprint ticks, region count) must be an IMPORT, never typed (FINDINGS #58/#66).
3. Draw-accounting before changing any RNG consumer; derived streams for new spawners.
4. Tune against the best policy you can write (`tools/audit-grind.ts`), and re-measure after every economy change — four audits in a row re-pointed at the next-weakest link.
5. e2e role-name collisions: check new button names against exact-match locators BEFORE pushing (FINDINGS #59).

## Phase 8g — Richer Spoils (2026-06-11, Expeditions brick 7)

- **Cache item drops** (quest.ts CACHE_LOOT + cachePool, CACHE_ITEM_CHANCE 25%): region-tiered pools (surface: darts/law/nature → mid: death/blood/karambwan → deep: rune helm/battleaxe/shark), minted into the pack in the advance cache branch; integrity gate covers the pools.
- Stats: cacheFinds, diceWon. Deeds (22): `lucky-find`, `high-roller` (3 dice wins, progress).
- verify-score redeployed in sync.

## Phase 8f — Dual-Metric Sprint Board (2026-06-11, Expeditions brick 6)

- **One replay, two verified metrics**: expeditions execute between ticks, so the existing 2k-sprint replay already proves any dungeon runs inside it — `ReplayResult`/`SprintVerdict` now carry `deepest` (world stats.deepestRegion), verify-score stores it (table gained `deepest int default 0` via live management SQL; leaderboard.sql updated), and board rows show a ⛏N depth badge (region name in the tooltip). Worth stays the ranking; depth is displayed glory.
- Replay-contract reminder surfaced by the test: replay worlds start with an EMPTY satchel — recorded runs that lean on pre-seeded fixture inventory don't reproduce. Production runs always satisfy this.
- verify-score redeployed (66.8kb).

## Phase 8e — Choices in the Dark (2026-06-11, Expeditions brick 5)

- **Encounter mix** (commands.ts advance, odds in quest.ts ENCOUNTERS): 60% monster, 15% cache (gp mints, scales with region depth), 10% snare (hp loss; lethal traps reuse `expeditionDeath` — the keep-3 rule now lives in one helper), 15% choice event.
- **`choose {accept}` command** resolves events: Shrine (tithe `max(50, packGp/4)` → full heal; cost burns), Goblin Dice (stake 100; win mints, loss burns). Declining is always free. `exp.journal` narrates non-combat moments (rendered under the controls).
- Test-loop rule: anything that drives expeditions must handle THREE states (combat / event / open path). E2e asserts "whatever the dark sends" via regex.
- verify-score redeployed (66.7kb) — choose/journal shapes now replay server-side.

## Phase 8c — Expedition UI (2026-06-11, Expeditions brick 3)

- **ExpeditionPanel** (third column, above the Sprint Board): region list with frontier locks (🔒/⚑/✓), pack builder over quest-relevant inventory (qty steppers; gear shows atk/def, food shows heals), embark; in the field — hp bar, atk/def/cleared/loot line, venture/extract; in combat — monster hp bar, last 5 log lines, fight/flee/eat-(food) chips. Reads world for display; every mutation via onCommand.
- **Death detection by transition**: an expedition that vanishes mid-combat (vs extract) toasts "you died — 3 most valuable made it home".
- Tests: jsdom drives a full fists-first plains run and the pack-escrow flow against the REAL engine; new e2e spec embarks and swings in chromium. Gotcha: item names appear in market+satchel+pack — scope queries to `.expedition`.

## Phase 8b — Expedition State Machine (2026-06-11, Expeditions brick 2)

- **Six-region node graph** (quest.ts REGIONS): Lumbridge Plains → Varrock Sewers → Edgeville Dungeon → Brimhaven Caverns → Wilderness Ruins → The Dragon's Maw. Clearing `REGION_CLEAR_KILLS` (3) encounters in your frontier region bumps `agent.questProgress` — the map unlocks one node at a time.
- **Six new commands** (commands.ts): `startExpedition {regionId, pack}` (escrows items out of inventory; validates unlock/holdings; seeds a PRIVATE RNG stream via `expeditionSeed(world.seed, nextExpeditionId++)` — the market cursor never moves, gates untouched), `advance` (encounter from the region pool), `fight`/`fleeCombat`/`eatFood {itemId}` (one combat round; eating burns the food via ledger), `extract` (pack + loot gp home).
- **Conservation through everything**: monster gp and item drops MINT at the kill (`ledger.gpMinted`/`itemsMinted` → pack); death keeps the 3 most valuable carried units (rest BURNED, loot gp burned); `checkInvariants` now counts expedition packs and packGp. Tested with invariants after EVERY command.
- **verify-score redeployed in sync** — sprint logs can now contain expedition commands; an out-of-date server bundle would silently skip them and mis-replay.
- Next: 8c Expedition UI panel.

## Phase 8a — Combat Core (2026-06-11, Expeditions arc brick 1)

- **The RPG arc begins** (Jesse picked "Expeditions on the live market"; design decisions in the phase file: turn-per-command menu combat, death keeps 3 most valuable items, node-graph map, per-expedition RNG stream so the market never re-rolls).
- **packages/engine/src/quest.ts**: `GEAR`/`CONSUMABLES` (curated REAL catalog ids — rune/dragon armory, sharks, antifire), `MONSTERS` (8-monster bestiary, giant rat → green dragon, loot tables of real item ids incl. 100% superior dragon bones), `deriveStats` (best-per-slot from the pack), `newCombat`/`resolveRound` (hit chance 0.55+0.02×(atk−def) clamped [0.15,0.95]; damage rng.int(⌈atk/3⌉,atk)−⌊def/4⌋ min 1; flee 0.6; dragonfire halved by antifire). Pure, RNG-injected, plain JSON.
- **Gate** (quest.test.ts): every referenced id exists in the catalog; stat derivation; full-fight determinism; geared-beats-goblin / fists-die-to-dragon; heal caps + antifire latch; flee both branches; loot seed-stability.
- Next bricks: 8b expedition state machine + map + applyCommand/ledger integration; 8c Expedition UI; 8d deeds/boards.

## Phase 7i — Leaderboards DEPLOYED (2026-06-11)

- **The whole backend went live via Jesse's access token** (management API): leaderboard table created (201), Auth Site URL fixed `localhost:3000` → the live game URL (magic links now land correctly), `verify-score` deployed via CLI (API bundling; Docker not needed). Verified: board reads 200 `[]` publicly; the function 401s non-user JWTs.
- The Sprint Board panel in the already-live bundle lights up automatically (its probe now returns `[]` instead of null) — no redeploy needed.
- **Redeploys** (only when engine changes affect replay): `npm run build:fn` + `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv` with `SUPABASE_ACCESS_TOKEN` set. Jesse can revoke the token at supabase.com/dashboard/account/tokens between deploys.

## Phase 7h — Sprint Board UI (2026-06-11, brick 3)

- **LeaderboardPanel** (third column): probes `fetchLeaderboard(seed)` once per seed and renders NOTHING on null — shipped ahead of the backend, lights up by itself when Jesse deploys. Rows = top-10 verified worth; submit posts the log (truncated to tick < SPRINT_TICKS) via `submitSprint` (functions.invoke, JWT automatic); handle persisted in localStorage `ew-handle`.
- **Provability guard**: `Game.logSince` (0 = recorded from birth). Pre-7f saves normalize to their current tick → "predates command recording" notice, submit disabled. newGame/restart → 0.
- **Test-network rule**: app.test.tsx installs a MODULE-SCOPE fetch stub with a mutable router (default offline) — supabase-js captures fetch at client construction, so per-test stubs would leak across the singleton. jsdom never touches the real backend.

## Phase 7g — Sprint Verifier & Leaderboard Backend (2026-06-11, brick 2)

- **Sprint format**: leaderboard = best worth at EXACTLY `SPRINT_TICKS` (10k) on a seed. Bounded replay (~1.4s) fits Edge Function CPU budgets and makes scores comparable. `verifySprint(seed, startGp, log)` (engine replay.ts): structural validation (seed/start/tick bounds/order/`SPRINT_MAX_COMMANDS`) then replay — pure, total for JSON inputs, unit-tested incl. each rejection reason and garbage-command tolerance.
- **supabase/leaderboard.sql**: `(user_id, seed)` PK, public SELECT, deliberately NO client write policies — only the Edge Function (service role) writes.
- **supabase/functions/verify-score/index.ts** (Deno): JWT-authenticated; re-verifies with verifySprint; upserts best-only; never trusts the claimed worth. Imports `./engine.js` — GENERATED by `npm run build:fn` (esbuild bundles replay.ts → 53kb ESM, Deno-clean).
- **Deploy (Jesse, one time):** `npm run build:fn` then `npx supabase functions deploy verify-score --project-ref chynnshtcjclphlazkmv` (needs `npx supabase login` first) + paste leaderboard.sql in the SQL editor.

## Phase 7f — Replay Verifier (2026-06-11, leaderboards brick 1)

- **UNBLOCKED**: Jesse ran the Supabase schema — `saves` table live, RLS verified both directions (anonymous read → `[]`, anonymous write → 42501).
- **`replayRun(seed, startGp, log, finalTick)`** (packages/engine/src/replay.ts, exported via barrel): rebuilds a run from its command log — commands recorded at tick T apply once the world reaches T, before T+1, matching the UI; clerk automation replays for free inside tickWorld; rejected commands re-reject identically (the log applies verbatim). Test proves record→replay hash-identity AND that a tampered log diverges.
- **`Game.commandLog`** (RunLogEntry[], persisted, normalized empty for old saves): App.command() records every human command pre-apply. A save file is now a *provable run*.
- Next bricks: leaderboard table SQL + Edge Function wrapping replayRun (deploy needs Jesse's Supabase access token), then submit/browse UI.

## Phase 7e — Time-Speak & Screenshot Refresh (2026-06-10)

- **fmtDuration** (game.ts): offline ticks → "~3h 25m" (1 tick ≡ 1s away); shown in the away banner and the catch-up overlay alongside raw ticks.
- **Guide** clerk bullet teaches the band vocabulary (cheap staples / big staples 5k+ / exotics yours alone).
- **README screenshot recaptured** — previous was 8 UI phases old (predated track chips, band line, vs-ghost delta).

## Phase 7d — Band Visibility & Big Leagues Deed (2026-06-10)

- **Ticket band tag**: the wiki-snapshot line now names the selected item's band — "staple — all clerks" (≤0.10) / "big staple — senior clerks" (0.12) / "exotic — human-only" (0.13) — making the risk select's vocabulary visible per item.
- **Big Leagues deed** (16th): latches on your first fill in the 0.12 band (fills × defs join, storm-rider pattern).

## Phase 7c — Clerk Orders Speak the Ladder (2026-06-10)

- **Risk select realigned** (UpgradeShop): tier max / "no big staples (≤10%)" / "cheap goods only (≤9%)" — the pre-ladder ≤8%/≤6% options were strategically meaningless after 7b. Selecting ≤10% on a tier-2/3 clerk now expresses a real choice: skip the ≥5k staple band.

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
