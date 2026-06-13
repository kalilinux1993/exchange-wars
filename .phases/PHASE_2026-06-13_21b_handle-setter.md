# Phase: Exchange Wars — Phase 21b: an always-available handle setter (the social features were stuck anonymous) (Brick 320)

**Started:** 2026-06-13
**Hat:** Builder (social/identity — fix a reachability gap, not a new mechanic)
**Goal:** The player's public handle (`ew-handle`) feeds the OFFLINE social surfaces — the 📋 brag + native
share, the ⚔ challenge/duel link, and the Hall Run Card — but the ONLY place to set it is the
LeaderboardPanel submit row, which is gated behind BOTH sign-in AND a live cloud board (absent by default).
So a signed-out / no-backend player can brag/challenge/show a card but can never set their name — all
permanently "A challenger" / blank byline. Add a handle setter that's always reachable.
**Done condition met:** yes — App owns the handle (single source of truth, raw-persisted under `ew-handle`
to match the existing reads + LeaderboardPanel) via a `HandleField` in the Hall; brag/challenge/BragCard
read App state (live); LeaderboardPanel takes the handle as an optional controlled prop (uncontrolled
localStorage fallback preserves its existing tests); unit + controlled-prop + App-integration tests;
suite + e2e green; typecheck clean.

## Design
- New `HandleField({ handle, onChange })` presentational panel in the Hall (always rendered, no auth/cloud
  gate) — the missing setter. App lifts `handle` to state seeded from `localStorage.getItem('ew-handle')`,
  with `setHandlePersist` writing RAW string back (NOT usePref/JSON — the existing reads + LeaderboardPanel
  use raw `getItem`/`setItem`, so JSON-quoting would corrupt them).
- Swap the three `localStorage.getItem('ew-handle') ?? ''` reads (shareBrag, copyChallenge, BragCard) for
  the live `handle` state so a just-typed name flows into the artifacts without a remount.
- LeaderboardPanel: `handle?`/`onHandleChange?` optional props; `const handle = controlledHandle ?? localHandle`.
  Given props → controlled by App (one source of truth in the signed-in case); omitted → its current
  localStorage-seeded state (the 9 existing LeaderboardPanel tests pass unchanged).

## Scope (in)
- packages/ui/src/components/HandleField.tsx (new presentational component)
- packages/ui/src/App.tsx (handle state + setter; 3 read swaps; render HandleField; thread to LeaderboardPanel)
- packages/ui/src/components/LeaderboardPanel.tsx (optional controlled handle)
- packages/ui/src/styles.css (.identity / .handle-input)
- packages/ui/test/app.test.tsx (HandleField unit + LeaderboardPanel controlled + App-integration)

## Scope (out — explicit non-goals)
- Server-side handle storage / uniqueness (handles stay client-local + leaderboard-claimed, as today)
- Changing sanitizeHandle or the submit flow; no engine change → no redeploy

## Subsystems touched
- packages/ui/src/{App.tsx, components/HandleField.tsx, components/LeaderboardPanel.tsx, styles.css}
- packages/ui/test/app.test.tsx

## Gates
- [x] HandleField shows the value + an empty/non-empty hint; onChange fires on edit
- [x] LeaderboardPanel honors a controlled handle prop; the 9 existing LeaderboardPanel tests still pass
- [x] App-integration: the Hall handle field persists to ew-handle and the BragCard byline reflects it
- [x] typecheck clean; UI suite 494 (+3); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- Could also surface the handle field in the masthead near the brag/challenge chips if discoverability
  proves low — defer until there's a signal.
