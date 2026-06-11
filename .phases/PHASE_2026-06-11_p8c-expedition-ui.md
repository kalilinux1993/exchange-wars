# Phase: Exchange Wars — Phase 8c: Expedition UI (Expeditions Brick 3)

**Started:** 2026-06-11
**Hat:** Builder (RPG arc — making 8b playable)
**Goal:** The Expedition panel (third column): region list with frontier locks, pack builder over quest-relevant inventory (gear + food with qty steppers), embark; in the field — hp bar, cleared count, venture/extract; in combat — monster hp, last log lines, fight/flee/eat chips. Death detected by transition → toast ("kept your 3 most valuable").
**Done condition:** full flow drivable by clicks against the real engine (jsdom tests), an e2e spec embarks and fights, gates green, CI + live.

## Scope (in)
- components/ExpeditionPanel.tsx (+ CSS: hp bars, region locks)
- App wiring (after LeaderboardPanel) + death-transition toast
- jsdom tests (locks render, embark escrows, combat chips work, eat consumes); e2e embark→fight spec

## Scope (out — next bricks)
- Guide/README expedition docs, expedition deeds, loot-sell nudges (8d); deepest-dive boards (8e)

## Gates
- [ ] typecheck + unit + e2e green
- [ ] CI green + live bundle verified
