# Phase: Exchange Wars — Phase 19o: How-to-Play refresh — fix death-keep drift + teach the 19-series instruments (Brick 301)

**Started:** 2026-06-13
**Hat:** Builder (discoverability — undiscovered features have ~zero value) + a drift fix
**Goal:** The How-to-Play overlay (last refreshed 18d) has drifted and lags the 19-series. (1) DRIFT: it says
death keeps "your 3 most valuable carried items" — but a Death Ward keeps 5 (`DEATH_KEEP_WARDED`); the README
was corrected for exactly this in 19c, the overlay wasn't. (2) GAPS: the survivability ladder (19f/19g, "kills
before you'd fall") + the lethality warning (19m), the order-book queue position + reprice (19h/19i), the
honest "cash out now" liquidation (19j), and away-fills (19l) aren't taught — their inline tooltips explain
them, but a player won't find them from the overview.
**Done condition met:** yes — the death-keep line reads "3 (5 with a Death Ward)"; the overlay teaches the
forecast/survivability/lethality reads, the offer queue+reprice, the true cash-out, and away-fills; anti-drift
assertions pin the new claims; suite + e2e green; typecheck clean.

## Why this brick
Ten bricks of decision-support shipped this session (19f–19m); each has a correct inline tooltip but the
HelpOverlay — the one place a new player reads the whole game — never mentions them. A feature nobody discovers
is dead weight. Plus the death-keep "3" is a live correctness drift (the engine keeps 5 with the Death Ward,
and the README already says so). Follows the 18d (help refresh, pinned against drift) and 19c (public-doc drift
fix) precedents — concise additions woven into existing bullets, not new bloat.

## Design — fix one number, weave three teaching clauses, pin them
- `HelpOverlay.tsx`:
  - Expeditions bullet: "3 most valuable carried items" → "3 most valuable carried items (5 with a Death
    Ward)"; add "the <b>forecast</b> reads each fight — your odds, ≈kills you'd survive before falling (more
    with packed food), and a <b>⚠ when a single hit could down you</b>."
  - Depth/offers bullet: add "your resting offers show their <b>queue position</b> (top of book / N ahead) —
    <b>reprice</b> jumps to the front; <b>Open Positions</b> shows what you'd truly <b>cash out</b> now
    (walking the bids), not just the paper mark."
  - Away bullet: "(wounds mend too)" → "wounds mend and your resting offers fill; the <b>welcome-back
    digest</b> tallies what you missed."
- `app.test.tsx`: extend the help-coverage test with `.toMatch` for Death Ward, "could down you", queue/reprice, cash out.

## Scope (in)
- `packages/ui/src/components/HelpOverlay.tsx`: the drift fix + three teaching clauses
- `packages/ui/test/app.test.tsx`: anti-drift assertions for the new claims

## Scope (out)
- No new component/feature (discoverability for already-shipped ones); no overlay restructure (weave into
  existing bullets); no engine change → no redeploy. Also logging a Jesse-gated DESIGN question (not fixing):
  the gear-baseline mismatch — effective-stat displays use `deriveStats(inventory,…)` while `gearDelta` compares
  vs `worn` and combat uses `deriveStats(pack,…)`; which baseline the gear-upgrade preview should use is a
  balance/UX call.

## Subsystems touched
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [ ] death-keep reads "3 (5 with a Death Ward)"; overlay teaches forecast/survivability/lethality, queue/reprice, cash-out, away-fills
- [ ] anti-drift assertions pin the new claims
- [ ] UI suite (+~0, assertions fold into the existing help test) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- Logged for Jesse: the gear-baseline design question above (real coherence wart; behavior unchanged this brick).
