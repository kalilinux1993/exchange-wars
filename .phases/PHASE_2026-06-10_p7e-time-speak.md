# Phase: Exchange Wars — Phase 7e: Time-Speak & Screenshot Refresh

**Started:** 2026-06-10
**Hat:** Builder (polish pass)
**Goal:** Players think in hours, not ticks: awaybar + catch-up overlay show "~Xh Ym" alongside tick counts; guide teaches the band vocabulary; README screenshot recaptured (8 UI phases stale).
**Done condition:** fmtDuration pure+tested, both banners show it, guide bullet updated, screenshot recaptured + visually verified, gates green, CI + live.

## Scope (in)
- game.ts: fmtDuration(ticks) (1 tick ≡ 1s offline)
- App: awaybar + catchup overlay use it; HelpOverlay clerk bullet gains band vocab
- SCREENSHOT=1 e2e recapture

## Scope (out)
- Chronicle cap; new features

## Subsystems touched
- packages/ui/src/{game.ts, App.tsx, components/HelpOverlay.tsx}, packages/ui/test/app.test.tsx, docs/screenshot.png

## Gates
- [x] typecheck + 125 unit + 8 e2e (incl. capture) green; screenshot visually verified
- [ ] CI green + live bundle verified (checked post-push)
