# Phase: Exchange Wars — Phase 18l: Float a triggered watchlist alert to the top (Brick 272)

**Started:** 2026-06-13
**Hat:** Builder (trading — make a fired alert unmissable)
**Goal:** Sort the Watchlist so rows whose buy/sell alert has FIRED float to the top — a fired alert tells
you when to act, but only if you see it, and `.mover.alerted` only tints the text gold, so a triggered row
buried mid-list in a long watchlist can be missed. Stable sort: a row moves only when its alert fires/clears.
**Done condition:** a triggered row renders above untriggered ones; untriggered rows keep insertion order;
suite + e2e green.

## Why this brick
The watchlist's whole purpose is "tell me when to act on a starred item" — the ≤ buy / ≥ sell alerts (and the
🔔 + gold-text `.mover.alerted` state) exist for exactly that. But the only highlight is a text-colour change,
so in a watchlist of many items a fired alert sitting at position 8 (and possibly scrolled out of view) is
easy to miss — the alert fired and you never saw it. Floating triggered rows to the top makes a fired alert
unmissable, completing the alert→SEE→act loop (the same actionability principle as the event/contract/bounty
jumps). The motion is meaningful, not noisy: a stable sort means a row moves only the moment its alert
crosses (fires) or un-crosses (clears) — exactly when you want it surfaced or released.

## Design — a stable triggered-first sort
- `WatchlistPanel.tsx`: extract `isTriggered(m)` (the existing inline buy/sell `alertHit` check); after
  building `rows`, `const sorted = [...rows].sort((a,b) => Number(isTriggered(b)) − Number(isTriggered(a)))`
  (Array.sort is stable → triggered group floats up, insertion order preserved within each group); map
  `sorted` instead of `rows`; the body reuses `isTriggered(m)` for its `triggered` const (dedupe).

## Scope (in)
- `packages/ui/src/components/WatchlistPanel.tsx`: the `isTriggered` extract + the stable triggered-first sort
- `packages/ui/test/app.test.tsx`: a render test (a fired alert on the 3rd-starred item renders 1st; others keep order)

## Scope (out)
- No sort by flip-margin/price (those fluctuate every tick → jittery reshuffles); triggered-state only changes on a meaningful cross. No engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/WatchlistPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] a triggered row (c's buy alert, 50≤100) floats to #1; a/b keep insertion order; 🔔/.alerted intact — render test
- [x] UI suite (443, +1) + e2e (11) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — reuses `alertHit`; relies on ES2019 stable Array.sort (modern target).
