# Phase: Exchange Wars — Phase 16m: Engine core review — SOUND + deriveStats tie-break hardening (Brick 221)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Maintainer (engine certification + determinism hardening)
**Goal:** Record the adversarial review of the engine core (conservation / determinism / matching) — verdict
SOUND, the deterministic economic foundation certified — and apply its one cheap recommendation: give
`deriveStats`'s pack gear pick the same `itemId <` tie-break the `equipBest`/`worn` paths already use, so the
rule is uniform and order-INDEPENDENT (closing a latent determinism trap in a hash-affecting path).
**Done condition:** `deriveStats` resolves equal-score gear by smaller itemId; the FULL engine suite passes
UNCHANGED (proving byte-identical — not replay-affecting); UI suite green.

## Why this brick
The engine was the one major subsystem not adversarially reviewed this run, and it's the foundation the
whole game + the replay-verified leaderboard depend on. The review traced every value mint/burn against the
ledger (GE tax, combat/loot, death forfeit, escrow, events, bailouts — all booked; `checkInvariants` covers
items incl. pack + worn), verified determinism (single rng cursor; the bounty/expedition streams consume
zero world draws; no unsorted-Record decision; integer gp; no JSON-dropping `undefined`), and confirmed
matching (price-time priority, self-trade skip, `TRADE_WINDOW` display-only). **SOUND, zero Critical/High.**
The one MEDIUM was a FRAGILITY, not a bug: `deriveStats` (quest.ts:335) picked equal-score pack gear by
strict `>` (insertion-order-dependent), while `equipBest`/`worn` (commands.ts:850) tie-break by `itemId <`.
Inert today (tied gear is stat-identical → same output), but a latent silent-determinism trap if future gear
has equal atk+def with differing identity. Cheap to make uniform; worth doing proactively (a determinism
divergence is the worst kind — silent, breaks leaderboard verification).

## Design — uniform tie-break, byte-identical
- `quest.ts` `deriveStats`: track `{ id, g }` per slot; pick by `score > cur || (score === cur && itemId <
  cur.id)` — the exact `equipBest` rule. `deriveStats` returns `{ atk, def }` (stats only, no identity), and
  tied gear has equal stats, so the SUMMED output is identical for all current data → byte-identical,
  hashState unchanged, NOT replay-affecting (no verify-score redeploy).

## Scope (in)
- `quest.ts`: the `deriveStats` tie-break (+ a comment pinning it to the equipBest rule + the determinism rationale)
- `quest.test.ts` (or equipment.test.ts): `deriveStats` output is insertion-order-INDEPENDENT for tied gear

## Scope (out)
- No other engine change; no verify-score rebuild (byte-identical → replay-neutral); the engine SOUND
  certification + the deferred-display-only items (16j #2) stand as documented

## Subsystems touched
- packages/engine/src/quest.ts
- packages/engine/test/ (the tie-break/order-independence test)

## Gates
- [x] `deriveStats` tie-break matches `equipBest` (`itemId <`); order-independence pinned (tied legs in both key orders → equal stats)
- [x] FULL suite 513 tests pass UNCHANGED (engine determinism/conservation/manyseed/longrun/expedition/equipment + UI); **sim seed-42/10k hash `fe75df57` UNCHANGED** → byte-identical confirmed
- [x] UI suite + e2e (9) + typecheck green
- [x] engine change but BYTE-IDENTICAL (hash `fe75df57`) → NOT replay-affecting → no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — the review certified the core; this applies its single recommendation, safely.
