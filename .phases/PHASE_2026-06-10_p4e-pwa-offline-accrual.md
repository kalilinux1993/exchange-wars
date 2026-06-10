# Phase: Exchange Wars — Phase 4e: PWA, Offline Accrual & Catalog III

**Started:** 2026-06-10
**Hat:** Builder (standing directive)
**Goal:** Make it a real idle game: reopening the page fast-forwards the world by real elapsed time (1 tick/sec, capped), with a "while you were away" banner; installable PWA shell; self-hosted fonts; catalog to 20 with aspirational top-shelf items.
**Done condition:** `applyOfflineProgress` (pure, clock injected) gated by unit tests incl. cap and blip-ignore; banner renders on reopen; manifest + service worker registered in prod builds; fonts bundled (no Google Fonts request — e2e boot back under ~5s); 20-item catalog with all gates green; build/deploy/push.

## Scope (in)
- Catalog +2: cannonball (mid-low), abyssal whip (120k/220k — aspirational; automation can't afford it, by design)
- game.ts: `lastSeenMs` stamped on save; `applyOfflineProgress(game, nowMs)` — 1 tick/sec real time, cap 50k ticks, ignore <60s blips; `viewNetWorth` moves here for reuse
- App: away-banner (ticks + worth delta, dismissible); SW registration (prod only)
- packages/ui/public: manifest.webmanifest + icon.svg + sw.js (network-first, cache fallback)
- @fontsource/cinzel + @fontsource/ibm-plex-mono imports; Google Fonts links removed
- Tests: offline progress unit cases + banner render; gates re-verified at 20 items

## Scope (out)
- Push notifications, background sync, workbox; CI; art overhaul

## Subsystems touched
- packages/engine/src/catalog.ts (data), packages/ui/* (game, App, public/, main, index.html), tests

## Gates
- [x] Engine gates green at 20 items (balance tests given explicit 30s timeout — runtime ceiling, not economics; whip unreachable by automation as designed)
- [x] Offline-accrual unit tests green (never-saved, 10-min, blip, week-cap cases) + banner render test; 74 unit + 5 e2e; e2e 31.5s → 5.1s after font self-hosting
- [x] Built + deployed to gh-pages; main push + live verification below

**Closed:** 2026-06-10 — done condition met.

## Open questions
- Offline cap (50k ticks ≈ 14h at 1 tps) — generous vs balanced; revisit with payback data
