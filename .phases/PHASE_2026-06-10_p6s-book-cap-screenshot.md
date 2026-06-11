# Phase: Exchange Wars — Phase 6s: Book Cap & Screenshot Refresh

**Started:** 2026-06-10
**Hat:** Builder (engine hardening + docs)
**Goal:** Hard cap on resting orders per agent per book (spam-test leftover from Phase 1) — generous enough to never bind in healthy sims (hash-equality proven), tight enough to stop a runaway strategy from flooding a book. Refresh docs/screenshot.png (still shows the 64-item build).
**Done condition:** cap enforced in placeOrder + unit test that it binds under deliberate spam; hashes identical on seeds 7/42/1337 × 8k ticks (proves it never binds normally → no sweep); new screenshot captured + verified; all gates green; CI + live.

## Scope (in)
- exchange.ts: MAX_RESTING_PER_AGENT_BOOK reject path
- exchange.test.ts: cap unit test
- Hash-equality proof (6p protocol)
- SCREENSHOT=1 e2e run → docs/screenshot.png

## Scope (out)
- Trades-window ring buffer (still micro); catalog growth

## Subsystems touched
- packages/engine/src/exchange.ts, packages/engine/test/exchange.test.ts, docs/screenshot.png

## Gates
- [x] Hash equality before/after: 7f338255/15cacaf8/81d9b0d9 identical (cap never binds normally)
- [x] typecheck + 113 unit + 7 e2e (incl. screenshot capture, visually verified) green
- [ ] CI green + live bundle verified (checked post-push)
