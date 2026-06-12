# Phase: Exchange Wars — Phase 11h: Net-Worth Trajectory Sparkline (Brick 86)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (feedback — complete the wealth dashboard with trajectory)
**Goal:** A small net-worth sparkline in the masthead, so current (net) + speed (gp/min) + trajectory (curve) sit together. UI-only, live on main.
**Done condition:** worth trajectory renders once history has ≥2 samples; suite + e2e green. **MET.**

## Outcome
- `components/Sparkline.tsx`: optional `ariaLabel` prop (default 'recent trend') so a second sparkline is individually queryable.
- `App.tsx`: a `.worthspark` Sparkline (72×18, `ariaLabel="net worth trend"`) in the purse after the rate cue, gated on `worthHistory.length >= 2` (so the "no data" fallback never shows). Fed `worthHistory.map(h => h.worth)`.
- `styles.css`: `.worthspark` inline alignment.
- Tests: at boot (1 sample) `queryByLabelText('net worth trend')` is null; after a +1k fast-forward (2nd sample) it's present. 253/253 unit (+1), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #120.

## Context
- Live on main. Forge + Skarn engine content still in PR #1 awaiting merge + `supabase functions deploy`.

## Gates
- [x] Trajectory renders once history ≥2 (render test, both directions)
- [x] Suite + e2e green; no aria collision with the ticket sparkline
- [x] No engine change → verify-score redeploy not required
