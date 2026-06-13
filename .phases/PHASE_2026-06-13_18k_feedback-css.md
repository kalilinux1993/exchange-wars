# Phase: Exchange Wars — Phase 18k: Style the session's new feedback classes (visual coherence) (Brick 271)

**Started:** 2026-06-13
**Hat:** Builder (visual coherence — make this session's features land in the theme)
**Goal:** Give the `.resting` order confirmation (18h) and the `li.stale` open-order row (18i) proper styling
using the existing theme tokens — `.resting` currently renders as plain unstyled text right beside its styled
siblings `.reject` (red) and `.filled` (green), and a stale order row looks identical to a fresh one but for
its glyph. Style with `--gold` (placed/attention) so the new signals read at a glance, not only via emoji.
**Done condition:** `.resting` shows in gold like its feedback siblings; a stale order row carries an amber
accent; gates green incl. an e2e that confirms the `.resting` colour applies in a real browser.

## Why this brick
This session added several `className` hooks (`.resting`, `li.stale`, `span.stale`) without CSS, so they
inherit only generic `dim small` / `<p>` defaults — the features work and the emoji glyphs (✓ ⏳) carry the
meaning, but the color/emphasis the design language uses elsewhere is missing. Worst offender: `.resting`
sits in the same feedback family as `.reject`/`.filled` (both styled with `--fall`/`--rise`) yet renders as
default text — a visible inconsistency I introduced. A small pass styling them with the EXISTING tokens
(`--gold`/`--gold-bright`) makes the signals legible and keeps the panel coherent. Matching established
siblings/tokens (not inventing colours) keeps it low-risk; a real-browser e2e confirms the rule applies.

## Design — existing tokens, matching siblings
- `styles.css`: `.resting { color: var(--gold); font-size: 0.82rem; }` (the placed-and-resting confirmation,
  sibling to `.reject`/`.filled`); `li.stale { border-left: 3px solid var(--gold); padding-left: 8px; }`
  (the dead-capital row accent) + `span.stale { color: var(--gold-bright); }` (the "⏳ rested Nt" text).

## Scope (in)
- `packages/ui/src/styles.css`: `.resting`, `li.stale`, `span.stale`
- `packages/ui/e2e/game.spec.ts`: an e2e that places a resting buy and asserts `.resting` is gold (real-browser CSS check, mirroring 17r)

## Scope (out)
- No new components/logic; no recolouring of existing classes; no engine change → no redeploy
- `.gaptop`/`.deathstakes` left as-is (consistent with their unstyled sibling `.rankgap` / their already-styled inner `.up`/`.down` spans)

## Subsystems touched
- packages/ui/src/styles.css
- packages/ui/e2e/game.spec.ts

## Gates
- [x] `.resting` renders gold rgb(212,169,55) in a real browser (e2e `toHaveCSS`); `li.stale`/`span.stale` accents added with the same tokens
- [x] UI suite (442, jsdom ignores CSS — unaffected) + e2e (11, +1 resting-colour test) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — uses existing tokens + standard selectors; the e2e proves the stylesheet loads and applies.
