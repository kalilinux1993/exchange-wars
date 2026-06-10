# Phase: Exchange Wars — Phase 6: Login & Cloud Saves

**Started:** 2026-06-10
**Hat:** Builder (Jesse provided Supabase project URL + publishable key)
**Goal:** Sign in by magic-link email; your save syncs to the cloud — open the live site anywhere, log in, trade. Latest-wins by lastSeenMs; offline accrual works ACROSS devices.
**Done condition:** AccountBar (sign-in / signed-in / sign-out states) in the masthead; cloud load-on-login adopts the newer save (with away-banner via offline accrual); debounced push on every save trigger; `supabase/schema.sql` in-repo with RLS; conflict chooser unit-tested; suites + e2e green; deployed; Jesse's 1-minute finisher documented (paste SQL + set Site URL).

## Scope (in)
- @supabase/supabase-js in packages/ui; src/cloud.ts (client, magic link, load/push, chooseSave); publishable key embedded (public by design)
- game.ts: `normalizeGame` shared by loadGame + cloud adoption
- App: session state, adoption effect, 5s-debounced cloud push; AccountBar component + styles
- supabase/schema.sql (saves table + RLS); README setup note
- Tests: chooseSave unit, AccountBar render, e2e masthead assert

## Scope (out)
- Leaderboards/replay verification (next in this arc), OAuth providers, shared-world multiplayer

## Gates
- [x] Suites + e2e green — 93 + 6 (engine untouched)
- [x] Jesse finisher documented (DEV_GUIDE + final summary): paste supabase/schema.sql; set Auth Site URL
- [x] CI + live on push (below)

**Closed:** 2026-06-10 — done condition met (pending Jesse's 1-minute console finisher to activate sync).
