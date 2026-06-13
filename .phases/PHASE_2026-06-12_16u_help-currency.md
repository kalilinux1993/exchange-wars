# Phase: Exchange Wars — Phase 16u: Help-guide currency — watchlist/alerts + the duel (Brick 229)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Maintainer (onboarding accuracy / feature discovery)
**Goal:** Bring the "How to Play" guide current for two real features it omits — the Watchlist + alert
system (price ≤/≥ and value-band 🟢/🟡 alerts, the cheap/fair/rich reads) and the "beat my score" DUEL —
so a new player discovers the decision-support tools and the competitive hook the game grew.
**Done condition:** The help guide has a decision-tools line (watchlist/alerts/value-bands) and the racing
line names the duel; docs/content-only gates green.

## Why this brick
The HelpOverlay is otherwise thorough and current, but it predates the value-band suite + the alert system
(a core part of how you decide what to trade) and the 16s/16t duel — so a new player reading it wouldn't
learn to star items, set alerts, read the 🟢/🟡 bands, or know a challenge link dares a friend to beat their
score. Feature discovery is a retention lever; the onboarding should reflect the game that ships (the same
accuracy principle as the README pass, 16n). Low-risk content currency at saturation.

## Design — one new bullet + one amended bullet
- Add a `<li>`: "⭐ Star items into your Watchlist; set ≤/≥ price alerts or a self-adjusting value-band
  alert (🟢 cheap to accumulate, 🟡 rich to take profit). Every price shows where it sits in its cost→value
  band." (the decision-support tools.)
- Amend the racing `<li>`: the challenge link now "dares them to beat your fortune" (the duel), and beating
  an accepted duel is celebrated.

## Scope (in)
- `HelpOverlay.tsx`: the watchlist/alerts/value-band `<li>` + the duel mention in the racing `<li>`
- `app.test.tsx`: the help mentions the watchlist/alerts + the duel (if a help test exists; else assert via render)

## Scope (out)
- No exhaustive feature dump (a few key omissions, not every lens); no layout/restyle; no engine/feature code change

## Subsystems touched
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx (if a help assertion fits)

## Gates
- [x] the guide now has a decision-tools bullet (Watchlist · ≤/≥ + value-band alerts · 🟢/⚪/🟡 cost→value reads) and the racing bullet names the duel ("dares a friend to beat your fortune" + 🏆 on passing)
- [x] typecheck clean + UI suite (381, +1: a help-content assertion) + e2e (9) green
- [x] content-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — factual additions matching the shipped features.
