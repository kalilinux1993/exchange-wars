# Phase: Exchange Wars — Phase 14r: Session-Scoped P&L (Brick 174)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — retention/feedback)
**Goal:** Show how your net worth has moved THIS session (since you opened the app) —
a short-term momentum read distinct from 13k's all-time stake result.
**Done condition:** The WealthPanel shows a "this session ↑/↓ X gp (±Y%)" line vs a worth
baseline captured at load and reset on a game swap; suite + e2e green.

## Why this brick
WealthPanel shows lifetime return-on-stake (13k) but nothing about THIS sitting — "am I up
since I sat down?" is the engagement question an idle/trading game wants answered. Fresh
subsystem (retention/feedback) after progression (14q). The follow-up was flagged in
NEXT_STEPS ("a session-scoped (this-load) P&L via a captured baseline, distinct from 13k").

## Design — App-owned baseline + pure helper, dumb panel
- Baseline lives in App (the root, which stays mounted across tab switches — a panel-local
  ref would wrongly reset "session" to "since you opened this tab"). Two refs mirror the
  PROVEN 14e idiom: `sessionBaseWorth` + `sessionBaseGame`; captured lazily on first render
  and re-captured when `game` identity changes (cloud-adopt / restart = a new session). The
  engine mutates `game.world` in place on ticks (game ref stable), so the baseline survives
  ticks and only resets on a real swap — exactly like the level-up baseline.
- `sessionPnL(worth, baseline)` (game.ts, pure) → `{ delta, pct, up }`; `pct` guards baseline 0.
- WealthPanel takes an optional `sessionStartWorth` and renders a "this session" line when the
  delta is non-zero, clearly distinct from the lifetime stake badge in the header (different
  time horizon — never conflate the two numbers).

## Why App, not the panel (the design call)
A mount-captured baseline in WealthPanel resets whenever the panel unmounts. WealthPanel sits
in a tab that unmounts on room switch, so its baseline would mean "since you last opened this
tab," not "this session." App is the only always-mounted owner → it holds the truth and passes
it down. (This is the unmount-sibling of the 14e/14f swap-guard class.)

## Scope (in)
- `game.ts`: `sessionPnL` helper
- `App.tsx`: two baseline refs + inline lazy capture at the WealthPanel call site + the prop
- `WealthPanel.tsx`: `sessionStartWorth` prop + the session line
- `app.test.tsx`: `sessionPnL` unit + a WealthPanel render assertion

## Scope (out)
- No engine change; no persistence of the baseline (session = this load, by design)
- No change to the lifetime stake badge or the composition bar

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/src/components/WealthPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `sessionPnL` unit (gain/loss/flat; baseline 0 → pct 0)
- [x] WealthPanel renders "this session ↑ +N (+33%)" when `sessionStartWorth` differs; omits it when flat
- [x] UI suite (302, +4) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Swap-guard coverage: the re-baseline reuses the 14e-tested `!== game` idiom; covered by the
  helper test + panel render + that proven pattern (App-internal ref capture is hard to unit-
  test in isolation — stated honestly, per the 14f coverage-accounting discipline).
