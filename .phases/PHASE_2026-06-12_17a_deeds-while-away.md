# Phase: Exchange Wars — Phase 17a: Deeds earned while away (away-bar) (Brick 235)

**Started:** 2026-06-12
**Hat:** Builder (retention — pay off the offline grind)
**Goal:** When a milestone is crossed during offline accrual (the clerk grows your worth while the tab is
closed), surface it in the away-bar: "🏅 earned while away: {deed names}". Today those deeds latch silently.
**Done condition:** A deed newly latched at the boot / catch-up checkMilestones (after offline accrual)
appears in the away-bar; no deed → no line; suite + e2e green.

## Why this brick
No `checkMilestones` runs DURING the offline gap, so a deed the clerk grows you past while away latches
silently at boot (the boot/catch-up `checkMilestones` returns were discarded). Coming back to find you became
a Millionaire while the tab was closed deserves the same acknowledgement a live level-up gets — it's the deed
sibling of 16v's offline duel settle and 14y's "while you were away" market movers. The away-bar is the
natural home (persistent until dismissed, already shows offline gp + movers), not a transient toast.

## Design — capture the checkMilestones return at the offline sites, render in the away-bar
- `App.tsx`: `awayDeeds: string[]` state. `beginOffline` resets it ([]) at the start of every absence; the
  boot-after-offline `checkMilestones` (line ~261) and the chunked catch-up finalize `checkMilestones`
  (line ~302) now CAPTURE their return (`.map(m => m.name)`) into it. The away-bar renders a `.awaydeeds`
  span when non-empty. (Same multi-site capture shape as `settleDuel` — the value advances on the offline
  path, so the check must run on the offline path.)
- **Pre-accrual latch (added during build):** at boot, run `checkMilestones` ONCE on the pre-gap state and
  DISCARD it, THEN accrue, THEN capture. So a deed already achievable before the gap (you earned it last
  session) latches silently and only deeds the accrual newly crossed count as "while away". Without it, a
  deed achievable-but-unlatched at boot (e.g. you hired the clerk just before leaving → `hired-help`) would
  be miscredited to the away period.
- **Discovered (logged, NOT fixed here):** `dragon-slayer`'s `achieved` reads `ledger.itemsMinted
  ['superior_dragon_bones'] > 0`, but a PRODUCER mints those bones within ~ticks of world creation (0→64 by
  tick 100), so the deed fires off the economy, not a player kill — a pre-existing oddity (it already
  mis-toasts in live play). A real returning player has it latched from prior play, so it never shows as
  "away"; only an artificial fresh-world+immediate-offline would surface it. Out of scope; noted in FINDINGS.

## Scope (in)
- `App.tsx`: `awayDeeds` state + reset in `beginOffline` + capture at the two offline checkMilestones sites + away-bar span
- `app.test.tsx`: a boot-after-offline deed surfaces in `.awaydeeds`; no-deed away-bar shows no line

## Scope (out)
- No engine change — no redeploy
- The tab-show (visibilitychange) path resets awayDeeds to [] but doesn't re-check there — those deeds
  toast on speed-resume via live refreshProgress (scoped: the "reopened the app" flow is the high-value case)
- No toast (the away-bar is the persistent home; a toast is last-writer-wins and would be clobbered)

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] deeds CROSSED during offline accrual show in `.awaydeeds`; pre-gap-achievable deeds (hired-help, dragon-slayer) excluded by the pre-accrual latch
- [x] UI suite (396, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — mirrors the settleDuel multi-site-capture pattern; the away-bar already owns "while you were away".
