# Phase: Exchange Wars — Phase 21a: time-to-afford readout on the upgrade shop (Brick 319)

**Started:** 2026-06-13
**Hat:** Builder (idle-loop / spend instrumentation — pivot off the 20a–20f a11y vein for breadth)
**Goal:** The Clerk's Counter shows "need +X gp" on an unaffordable upgrade but no sense of WHEN you'll
afford it, or that you might afford it RIGHT NOW by liquidating goods. Add an honest time-to-afford hint.
**Done condition met:** yes — a pure `affordEta(cost, worth, worthPerMin)` helper drives a hint appended
to each shortfall: "💰 sell to afford" when net worth already covers the cost (cash is just tied up in
goods), "≈Ym" when worth < cost and wealth is growing (ETA = (cost − worth)/worthPerMin), nothing when
wealth is flat/falling (no misleading ETA); unit + render tests; suite + e2e green; typecheck clean.

## Design
- This is the feature NEXT_STEPS declined ("ETA-to-afford … needs a parallel gp-history first") — but the
  decline assumed dividing a CASH shortfall by a WEALTH rate (mismatched units). Correct framing: upgrades
  cost cash, but cash is fungible with goods (you can liquidate), so time-to-afford keys on NET WORTH
  growth vs the worth gap (cost − worth) — units match `worthRate`, and the worth ≥ cost > gp case becomes
  "you can afford it now, just sell." So it reuses the EXISTING `worthHistory`/`worthRate` — **no new
  persisted field, no migration, no new sampling** (the cleaner, lower-risk path than a gpHistory series).
- `affordEta` is only called in the `view.gp < cost` branch (callers gate), so it returns liquidate / eta /
  slow — not "affordable". ETA formatted via `fmtDuration(etaMin*60)` like the WorthChart next-round ETA.

## Scope (in)
- packages/ui/src/game.ts (pure `affordEta` next to `worthRate`)
- packages/ui/src/components/UpgradeShop.tsx (optional `worth`/`worthPerMin` props; hint in `need`)
- packages/ui/src/App.tsx (pass `worth` + `worthRate(...).perMin` to UpgradeShop)
- packages/ui/src/styles.css (`.afford-now` positive tint, `.afford-eta` dim — not warning-coloured)
- packages/ui/test/app.test.tsx (affordEta unit cases + an UpgradeShop render assertion)

## Scope (out — explicit non-goals)
- A gpHistory cash-flow series (rejected above — noisier and unnecessary under the worth-gap framing)
- Changing the shortfall amount (still cash: cost − gp) or the buy gating (still `gp < cost`)
- No engine change → no redeploy

## Subsystems touched
- packages/ui/src/{game.ts, App.tsx, components/UpgradeShop.tsx, styles.css}
- packages/ui/test/app.test.tsx

## Gates
- [x] affordEta: liquidate (worth≥cost) · eta (worth<cost, perMin>0, correct minutes) · slow (perMin≤0/null)
- [x] UpgradeShop renders the hint; existing "need +X" test still passes (props optional)
- [x] typecheck clean; UI suite 491 (+6); e2e 15 (1 on-demand skip)
- [x] UI-only — no engine change, no redeploy

## Open questions
- If the worth-rate proves too jumpy in play, widen `worthRate`'s window for this readout only (defer).
