# Phase: Exchange Wars — Phase 13a: Help Overlay Keyboard Docs (Brick 131)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (onboarding/discoverability — make the new keyboard features findable; keep the help from drifting)
**Goal:** Document the j/k market nav (12g) and b/s side toggle (12t) in the How-to-Play overlay; source the starting-gp figure from the constant so it can't go stale. UI-only, live on main.
**Done condition:** help's keyboard line lists j/k + b/s; start gp uses `HUMAN_START_GP`; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
The session added a full keyboard-driven trade flow (j/k pick the market row, b/s pick the side), but the only hints were a market-table footer and a button title — the help overlay's keyboard line still listed just 1/2/3/p/?. A feature nobody can discover is half-built; the help is where a new player learns the keyboard exists. Also noticed the help hardcoded "55,000 gp" while sourcing regions/sprint-ticks from constants — a latent drift waiting to happen.

## Outcome
- `HelpOverlay.tsx`: keyboard line now adds "In the Exchange, j/k (or ↑/↓) walk the market and b/s pick buy or sell"; the start figure is `{HUMAN_START_GP.toLocaleString()}` (matches the constant pattern already used for `REGIONS.length`/`SPRINT_TICKS`).
- Tests (+1): the overlay renders the j/k ("walk the market") + b/s ("pick buy or sell") docs. 356/356 unit, 9/9 e2e. FINDINGS #165.

## Gates
- [x] Help documents j/k + b/s (render test)
- [x] Start gp sourced from `HUMAN_START_GP`
- [x] Typecheck + 356 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- (none — the help now covers all current shortcuts and auto-tracks the key constants.)
