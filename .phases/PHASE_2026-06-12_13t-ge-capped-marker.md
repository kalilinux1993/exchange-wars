# Phase: Exchange Wars — Phase 13t: GE-Capped Flip Marker (review-driven) (Brick 150)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Reviewer→Builder (acting on an adversarial review of the session's money helpers)
**Goal:** Tighten `flipAffordability.limited` and surface it as a "GE-capped" marker on flips.
**Done condition:** `limited` is correct on the limit=0 edge; affordable-but-limit-capped flips show a "GE" tag; suite + e2e green. **MET.**

## Why this brick
An adversarial review of the four new money helpers (`returnOnStake`, `flipAffordability`, `underwaterSummary`, `gearDelta`) returned **SOUND** — no real bugs. Its one note: `flipAffordability.limited` was loose (could be `true` when `units===0`, i.e. a zero buy limit), but the caller only read it inside the affordable branch, so it was latent-not-live. This brick acts on that: tighten the flag AND make it useful by surfacing it.

## Design
- `flipAffordability.limited` now requires `units >= 1` — so a zero buy limit (can't buy) is NOT "limited" (which means "you have gp to spare but the GE limit caps you").
- TopFlips renders a dim "GE" tag after the `×N` badge when `limited` — telling you the flip can't scale further THIS window even with more capital (the GE buy limit, not your purse, is the cap). A genuine scaling signal, distinct from "×N" (gp-bound) and "✕" (unaffordable).

## Outcome
- `TopFlips.tsx`: tightened `limited`; "GE" marker + sharpened badge title.
- `styles.css`: `.gecap`.
- Tests (+2): `flipAffordability(100,1000,0)` → `limited:false` (the edge the review flagged); a flip with gp to spare but `buyRemaining:5` renders a `.gecap` marker.

## Gates
- [x] limit=0 no longer flagged "limited"; GE marker renders when gp-spare + limit-capped (unit + render tests)
- [x] UI suite (267, +2) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, **no new redeploy** (batch stays 12b+13d+13e+13f+13r)

## Review outcome (logged)
- `returnOnStake`, `underwaterSummary`, `gearDelta`: confirmed CORRECT (no change). Arrow direction independent of rounded pct; unmarked positions excluded; worn override reads only `worn[g.slot]`.

## Follow-ups
- None — the affordability lens (flips/positions/upgrades) is now complete and the latent flag is live + correct.
