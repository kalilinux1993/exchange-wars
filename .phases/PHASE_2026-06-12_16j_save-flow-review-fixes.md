# Phase: Exchange Wars — Phase 16j: Save-flow review fixes — catch-up swap-guard + newGame parity (Brick 218)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Maintainer (data-integrity, review-driven)
**Goal:** Fix the real bugs an adversarial review of the save/offline/cloud-adoption flow found: (HIGH) a
game swap (cloud-adopt / import / restart) while a chunked offline catch-up is in flight runs the OLD
plan's ticks against the NEW game and finalizes a stale plan — corrupting the adopted/restarted save;
(trivial) `newGame` omits `delves` that `normalizeGame` defaults, so a fresh game ≠ a normalized one.
**Done condition:** The catch-up driver aborts (never runs ticks on / finalizes against) a game it wasn't
planned for; `newGame().delves === []`; the lower findings are documented; existing tests + suite + e2e green.

## Why this brick
The save/load/offline path had never had a focused review and is the highest-severity place for a latent
bug (data loss / determinism break > any cosmetic flaw). The review (self-correcting, calibrated) certified
the negative space — corrupt-save quarantine loss-free, plain-JSON discipline holds, the up-front
`lastSeenMs` restamp fails in the safe direction — and found one HIGH local bug worth fixing now, one
trivial parity gap, and two lower issues to document.

## The bug (HIGH #1)
`beginOffline` hands a big offline debt to a chunked catch-up driver (`useEffect([catchUp])`) that reads
`gameRef.current` fresh each chunk but runs `planRef.current` (the plan made for the game `beginOffline`
saw). If `gameRef` is swapped mid-catch-up — cloud adoption with a SMALL cloud debt (sync path, doesn't
re-`setCatchUp`), import, or **restart (never calls `beginOffline` at all)** — the in-flight chunks advance
the NEW world by the OLD tick count and `finishOfflineProgress(newGame, oldPlan)` closes a stale plan
against it: over-advanced ticks (determinism/worth corruption) + garbage "while away" deltas.

## Design — tag the catch-up with its game; driver aborts on mismatch
- `App.tsx`: add `catchUpGame` ref; `beginOffline` sets it alongside `planRef` when it starts a chunked
  catch-up. The driver, before doing anything, checks `catchUpGame.current !== gameRef.current` → abort
  cleanly (`planRef = null; setCatchUp(null); return`) — never run/finalize a mismatched plan. Robust at
  ALL swap sites (any gameRef change trips it), so restart needn't be special-cased.
- `game.ts`: `newGame` includes `delves: []` (and any other field `normalizeGame` defaults) so a fresh
  game is byte-identical to a normalized one (#3).
- Comment the offline-replay idle invariant (MEDIUM): offline `runTicks` logs no commands, which is
  replay-correct ONLY because the player agent is `policy:'idle'` — flag it for the day automation acts offline.

## Scope (in)
- `App.tsx`: `catchUpGame` ref + the driver abort-on-mismatch guard
- `game.ts`: `newGame` `delves: []` parity + the idle-invariant comment
- `app.test.tsx`: `newGame().delves` is `[]` (fresh ≡ normalized)

## Scope (out)
- Cross-device double-accrual (review #2): documented, NOT fixed — it inflates DISPLAYED worth only (the
  verified leaderboard score replays from `commandLog`, where idle offline ticks reproduce identically), and
  a proper fix needs a multi-device-model decision (Jesse's call). recordFills-window incompleteness across
  a long catch-up is by-design (capped `trades` window) — documented. No engine change.

## Subsystems touched
- packages/ui/src/App.tsx
- packages/ui/src/game.ts
- packages/ui/test/app.test.tsx

## Gates
- [x] the catch-up driver aborts (`planRef=null; setCatchUp(null)`) when `gameRef.current` ≠ `catchUpGame.current` — guard added before the chunk/finalize
- [x] `newGame().delves === []` (fresh ≡ normalized, pinned); all 367 existing tests green (normal catch-up path unchanged — guard only fires on a swap)
- [x] UI suite (367, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- The cross-device concurrency model (review #2's open question) — left to Jesse; documented as a known display-only limitation.
