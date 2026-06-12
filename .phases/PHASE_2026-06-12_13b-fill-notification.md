# Phase: Exchange Wars — Phase 13b: Resting-Fill Notification (Brick 132)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (trading feedback — tell the player when a resting order fills)
**Goal:** A toast when a resting order fills during live ticks (you place a buy below market, advance time, it fills silently), spam-gated to 1× so it can't flood at speed. UI-only, live on main.
**Done condition:** "🪙 your offers filled" toast on new resting fills at 1×; never at fast speed / on command (instant fills already shown in the ticket); pure helper + recordFills return tested; suite + e2e green; no engine change → no redeploy. **MET.**

## Why this brick
Instant fills (a crossing order) show "filled N instantly" in the ticket. But a RESTING order fills later, during ticks, while you're trading something else — silently. The only cue was the open-orders list shrinking. A toast closes the feedback loop ("your capital deployed / your goods sold").

## Spam-safety (the design crux)
Fills can happen most ticks at high speed → a naive toast would flood and crowd out milestone/alert toasts. Three guards: (1) gated to **1× only** (`refreshProgress(speed <= 1)`) — bulk/fast-forward/offline fills are summarized elsewhere; (2) **command path passes false** — instant fills are already narrated by the ticket, so no double-notify; (3) the fill toast fires FIRST in `refreshProgress`, so the milestone/alert toasts after it **override** on a busy tick (fills are lowest priority).

## Outcome
- `game.ts`: `recordFills` now RETURNS the genuinely-new fills it latched (was void; additive — existing callers ignore it). `fillSummary(fills)` → "bought N · sold M" or null. Pure.
- `App.tsx`: `refreshProgress(notifyFills = false)` toasts `fillSummary` of the new fills when `notifyFills`; the live tick loop passes `speed <= 1`.
- Tests (+2): `fillSummary` (aggregate buys/sells, null empty) + `recordFills` returns the new fills and is idempotent on re-scan (dedupe). 358/358 unit, 9/9 e2e. FINDINGS #166.

## Gates
- [x] `fillSummary` pure + `recordFills` returns fresh fills (idempotent re-scan)
- [x] Notify gated to 1×, off the command path, lowest-priority toast
- [x] Typecheck + 358 unit + 9 e2e green
- [x] No engine change → verify-score redeploy NOT required

## Follow-ups
- A richer per-item fill toast ("bought 50 Shark @ 800") if the aggregate proves too terse.
