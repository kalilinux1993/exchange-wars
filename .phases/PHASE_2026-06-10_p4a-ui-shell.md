# Phase: Exchange Wars — Phase 4a: UI Shell (packages/ui)

**Started:** 2026-06-10
**Hat:** Builder (frontend vertical slice; aesthetics provisional pending Jesse's direction)
**Goal:** A playable browser shell: the live economy ticking in the page, the human as an idle-policy player issuing commands through the protocol, with save/load and fast-forward. Functional-first; art direction flagged provisional.
**Done condition:** `npm run dev -w @exchange-wars/ui` serves a playable game (market table, trade ticket, player panel, upgrade shop, tick controls, localStorage save/load, fast-forward); `vite build` succeeds; jsdom component tests green (place order → appears in open orders; fast-forward advances ticks; buy slot reflects); all engine gates untouched-green.

## Scope (in)
- packages/ui: Vite + React + TS, importing @exchange-wars/engine only via its barrel
- Human player = idle-policy agent (inert engine-side until automation purchased) — commands from click handlers
- Game loop in the page (setInterval OUTSIDE engine), speed control, pause, fast-forward (runTicks burst)
- Save/load via localStorage JSON snapshot; new-game with chosen seed
- Components: MarketTable, TradeTicket, PlayerPanel (inventory/open orders/cancel), UpgradeShop (slots + autoFlip tiers), header status
- jsdom component tests (vitest); OSRS-GE-flavored provisional styling

## Scope (out)
- Playwright browser E2E (Phase 4b — needs browser binary install)
- PWA manifest/offline (Phase 4c), mobile polish, charts
- Any engine change beyond none (UI is a pure consumer)

## Subsystems touched
- packages/ui/* (all new), root vitest config (ui tests), root package.json scripts

## Gates
- [x] vite build succeeds — 215kB JS (67kB gzip), 5.9kB CSS
- [x] jsdom component tests green — 6 flows through the real engine (escrow/refund asserts included)
- [x] All engine gates green — 72 tests total
- [x] Manual playability deferred to Jesse + Playwright E2E in 4b (recorded). Adversarial review not gated this phase: UI is a pure consumer of the reviewed protocol (no dangerouslySetInnerHTML, React-escaped rendering, guarded save parse); browser E2E in 4b is the meaningful next gate.

**Closed:** 2026-06-10 — done condition met.

## Open questions
- Art direction — provisional OSRS-GE dark/parchment/gold theme; Jesse to steer
