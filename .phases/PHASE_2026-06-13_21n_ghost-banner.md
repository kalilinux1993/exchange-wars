# Phase: Exchange Wars — Phase 21n: surface the ghost race in the masthead (duel/ghost symmetry) (Brick 332)

**Started:** 2026-06-13
**Hat:** Builder (retention — make the solo race as FELT as the social one)
**Goal:** The DUEL race (16t) gets an always-visible masthead banner ("⚔ dueling {handle} … you: {now}"), but
the GHOST race (17t, restart a seed to beat your past self) only shows its delta buried in the Hall-tab Fortune
chart. Surface a parallel ghost-race banner in the masthead so the solo race is a live presence too.
**Done condition met:** yes — when racing a ghost on this seed AND not in a duel, a "🏁 racing your best run —
beat {ghostNow} (you: {now}, ±X)" banner shows, reusing the exported `ghostWorthAt` + `playerWorth`; it yields
to an active duel (no double banner); render tests; suite + e2e green; typecheck clean.

## Design
- Reuse `ghostWorthAt(history, tick)` (already exported from WorthChart, already powers the chart's "vs ghost"
  stat) — `ghostNow = ghostWorthAt(game.ghost.history, world.tick)`, `delta = playerWorth − ghostNow`. The
  banner mirrors the duel banner's shape/placement (a `.awaybar` row after it), gated on
  `game.ghost?.seed === world.seed && history.length >= 2 && !game.duelTarget` (the duel takes precedence so
  the two race banners never stack). No × dismiss — the ghost is your own history, not an accepted target.
- Non-redundant with the chart's "vs ghost": that's a quiet Hall-tab stat; this is an always-visible race
  presence (exactly the value the duel banner provides over a mere chart line).

## Scope (in)
- packages/ui/src/App.tsx (import ghostWorthAt + the masthead ghost-race banner)
- packages/ui/src/styles.css (a `.ghostrace` tint if `.duel` has one — parity)
- packages/ui/test/app.test.tsx (banner shows when racing a ghost; yields to a duel)

## Scope (out — explicit non-goals)
- No new ghost CAPTURE/replay logic (17t already captures the ghost); no engine change → no redeploy
- No dismiss control (the ghost isn't a target you can abandon)

## Subsystems touched
- packages/ui/src/{App.tsx, styles.css}
- packages/ui/test/app.test.tsx

## Gates
- [x] ghost-race banner shows worth-at-tick + you + ±delta when ghost matches the seed
- [x] it is suppressed while a duel is active (no double race banner) and absent with no ghost
- [x] typecheck clean; UI suite 518 (+2); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- If both a ghost AND a duel are common at once, a combined race readout could be nicer — defer (duel wins for now).
