# Phase: Exchange Wars — Phase 16v: Win the duel OFFLINE too (settle at every worth-update) (Brick 230)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Maintainer (correctness — duel robust to the idle loop)
**Goal:** Fire the "🏆 You beat …" celebration (and clear the duel) wherever worth crosses the target — not
only on a LIVE tick. The clerk grows your worth OFFLINE, so beating an accepted duel while the tab is closed
must also win it; today it's silent and leaves a stale "beat {worth}" banner.
**Done condition:** Beating the duel via offline accrual / on boot fires the celebration once and clears
`duelTarget`; the live path is unchanged; suite + e2e green.

## Why this brick
16t's duel-won detection lives only in `refreshProgress` (live ticks). But this is an idle game: the
auto-flipping clerk advances your worth during offline catch-up, so your worth can cross the duel target
while you're away — and on reopen the banner still says "beat {worth}" though you've passed it, with no
celebration. The duel must settle at EVERY place worth is updated (live, boot-after-offline, the chunked
catch-up finalize), or the idle loop silently breaks it.

## Design — extract `settleDuel`, call it at all worth-update sites
- `App.tsx`: `settleDuel(g)` — if `duelWon(g.duelTarget, playerWorth(g))`, fire the one-shot "🏆 You beat
  {handle}!" toast, `delete g.duelTarget`, `saveGame(g)` (self-contained, idempotent: gone → no re-fire).
  Replace the inline check in `refreshProgress` with `settleDuel(game)`; ALSO call it in the boot effect
  (after `beginOffline`/`checkMilestones`) and in the chunked catch-up finalize (after its `checkMilestones`).

## Scope (in)
- `App.tsx`: `settleDuel` + its three call sites (refreshProgress, boot, catch-up finalize)
- `app.test.tsx`: booting with a save whose worth already clears the target fires "You beat" + drops the banner

## Scope (out)
- No change to `duelWon` (16t) or the banner; no engine change

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] `settleDuel` (idempotent delete+save) replaces the inline live check and is also called from the boot effect + the catch-up finalize
- [x] booting with worth already past the target fires "You beat rival" + drops the "dueling" banner (pinned)
- [x] UI suite (382, +1) + e2e (9) green; typecheck clean (settleDuel referenced in earlier effects works — closures run post-render)
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — `settleDuel` is idempotent (delete+save), so calling it at multiple sites can't double-fire.
