# Phase: Exchange Wars — Phase 6d: Onboarding & Deeds Progress

**Started:** 2026-06-10
**Hat:** Builder (public-game gap: zero onboarding)
**Goal:** First-run "How to Play" overlay (device-level, dismiss-once, re-openable via "?") and progress percentages on locked worth-based Deeds.
**Done condition:** Fresh devices see the guide; dismissing persists (localStorage flag, not the save); "?" reopens; e2e specs dismiss it in beforeEach and the boot spec asserts it; locked worth milestones show progress; suites green; CI + live.

## Scope (in)
- HelpOverlay (scrim + parchment guide: trading, tax, slots, clerk, events, contracts, offline, sign-in); "?" chip; localStorage 'ew-help-seen'
- Milestone defs gain optional progress(); MilestonesPanel renders % on locked deeds
- e2e beforeEach dismissal + boot assert; jsdom flow tests

## Scope (out)
- Catalog changes (regen toll spent last iteration), leaderboards (blocked on Supabase finisher)

## Gates
- [x] Suites + e2e green — 97 + 6
- [x] CI + live on push (below)

**Closed:** 2026-06-10 — done condition met.
