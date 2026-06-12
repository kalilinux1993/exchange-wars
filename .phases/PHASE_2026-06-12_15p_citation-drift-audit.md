# Phase: Exchange Wars — Phase 15p: Citation-Drift Audit (Brick 198)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Maintainer (correctness of the permanent record)
**Goal:** Audit the codebase's `file:line` source citations for drift after ~29 UI bricks,
fix the live/followed ones, and verify the one cross-module duplicated formula is still in sync.
**Done condition:** Every actively-followed citation resolves to the right line; the
`expectedHit`↔`damage()` mirror is re-verified equal; suite + e2e green.

## Why this brick
Feature returns are genuinely diminishing after ~29 UI bricks (trading is deep, RPG threat/embark
loop complete, retention/onboarding/events all instrumented). A citation audit is the cheap,
high-value maintenance pass: the codebase has exactly ONE source-comment `file:line` citation
(`game.ts:342` → the engine damage formula), and it's the load-bearing one — it tells the next dev
where the duplicated `expectedHit` formula must stay in sync. If that pointer drifts, the duplication
debt (flagged in FINDINGS #148) silently rots. Audit found it drifted (394→407) and the active
NEXT_STEPS note (line 12) carried the same stale number.

## What the audit found
- **`game.ts:342`** — comment "mirrors the engine's `damage()` MEAN (quest.ts:394)" — DRIFTED.
  `damage()` is now at **quest.ts:407** (line 394 now holds `outcome: 'fighting'`). FIXED.
- **`NEXT_STEPS.md:12`** — "mirrors the engine damage formula (quest.ts:394)" — same drift. FIXED → 407.
- **Formula re-verified IN SYNC (the real-bug check, not just the citation):**
  `damage()` (quest.ts:407): `raw = rng.int(max(1,ceil(atk/3)), max(2,atk)); return max(1, raw − floor(def/4))`.
  `expectedHit()` (game.ts:347): `lo=max(1,ceil(atk/3)); hi=max(2,atk); return max(1, (lo+hi)/2 − floor(def/4))`.
  Mean of a uniform roll in [lo..hi] is (lo+hi)/2 → `expectedHit` correctly mirrors `damage()`'s mean.
  No logic bug — only stale line numbers.
- **FINDINGS #148 (brick 114) / #207 (brick 176)** cite `quest.ts:394` / `App.tsx:900` — left AS-IS.
  These are append-only historical narrative anchored to their brick numbers; the numbers were
  correct when written. Rewriting them would falsify the point-in-time record.

## Scope (in)
- `game.ts:342` citation 394 → 407 (comment only)
- `NEXT_STEPS.md:12` citation 394 → 407
- FINDINGS entry documenting the audit + the negative result (formula still in sync)

## Scope (out)
- No rewrite of historical FINDINGS line numbers (point-in-time records)
- No engine change, no logic change → no verify-score redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Subsystems touched
- packages/ui/src/game.ts (comment)
- NEXT_STEPS.md, FINDINGS.md (docs)

## Gates
- [x] `damage()` confirmed at quest.ts:407 (grep)
- [x] `expectedHit` re-verified equal to `damage()`'s mean (hand-check + existing pinned tests)
- [x] typecheck clean; UI suite + e2e green (no test change — comment/doc only, gated per discipline)
- [x] UI/doc-only — no engine change, no redeploy

## Open questions
- None — the one source citation is fixed; historical records intentionally preserved.
