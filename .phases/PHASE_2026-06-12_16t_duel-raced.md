# Phase: Exchange Wars — Phase 16t: The duel, raced — accept → beat the target → celebrate (Brick 228)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — close the duel loop into a played experience)
**Goal:** Make an accepted "beat my score" duel (16s) a REAL race: persist the target into the run, show a
banner "⚔ dueling {handle} — beat {worth}" while it's live, and fire "🏆 You beat {handle}!" when your worth
clears it — so accepting a duel has a visible goal and a payoff, not a target shown once then forgotten.
**Done condition:** Accepting a duel stores the target on the run (survives reload); a banner shows it +
your progress; crossing it fires a one-shot celebration and clears the duel; suite + e2e green.

## Why this brick
16s shows the target in the challenge bar — but the bar vanishes the moment you accept (restart), so the
duel is invisible during play and beating it is silent. The mechanic only becomes a DUEL when the target
rides the run (a visible goal you race) and beating it is acknowledged. The natural completion of 16s; a
UI-only persisted field (`Game.duelTarget`, like `ghost`/`milestones` — NOT in WorldState, not replay-affecting).

## Design — a persisted target, a banner, a beat-detection
- `game.ts`: `Game.duelTarget?: ChallengeTarget` (UI-only, persisted); `duelWon(target, worth)` →
  `worth >= target.worth` (pure, testable).
- `App.tsx`: `restart(seed, duel?)` stamps the new run's `duelTarget`; the challenge-accept passes
  `challengeTarget`. In `refreshProgress`, when `duelWon(game.duelTarget, w)` fires a one-shot "🏆 You beat
  {handle}'s {worth}!" toast (high priority, in the celebration block), then DELETES `duelTarget` + saves
  (fire-once, survives no reload). A duel banner (when `duelTarget` set, like the away/challenge bars) shows
  "⚔ dueling {handle} — beat {worth} gp (you: {worth})" with a dismiss.

## Scope (in)
- `game.ts`: `Game.duelTarget` + `duelWon`
- `App.tsx`: `restart` duel param + accept wiring + the beat-celebration in refreshProgress + the duel banner
- `app.test.tsx`: `duelWon` unit; the duel banner renders with a target

## Scope (out)
- No mid-run target re-negotiation; the claimed-not-verified semantics stand (16s); no engine change

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `duelWon` true exactly when worth ≥ the target (tie counts), false with no duel; the duel banner shows handle + target while `duelTarget` is set
- [x] crossing the target fires the "🏆 You beat …" toast once and `delete`s `duelTarget` + saves (no re-fire / survives no reload); a × abandons the duel
- [x] UI suite (380, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — `duelTarget` is UI state on `Game` (like `ghost`), so it persists + survives reload without engine impact.
