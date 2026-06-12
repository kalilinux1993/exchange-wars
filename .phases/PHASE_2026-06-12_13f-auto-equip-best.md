# Phase: Exchange Wars — Phase 13f: Auto-Equip Best (one-click) (Brick 136)

**Started:** 2026-06-12
**Hat:** Builder (engine+UI — the "auto-equip best" follow-up I offered after 13e)
**Goal:** One click equips the single best USABLE owned piece in every gear slot, level-aware and atomic.
**Done condition:** `equipBest` engine command (deterministic, conservation-safe, rejects mid-expedition, no-op when nothing improves) + a PlayerPanel "equip best" button; benchmark/sim byte-identical; suite + e2e + sim green; engine.js rebuilt; redeploy flagged.

## Why this brick
13e added per-piece equip/unequip. A player upgrading a full kit has to click each piece and reason about level reqs manually. "Equip best" does it in one click. It MUST live in the engine: a UI-only loop can't know the player's combat levels, so it would equip under-level (inert) gear or skip usable upgrades.

## Design — reuse the exact deriveStats best-per-slot logic
- New `{ type: 'equipBest' }` command. For each gear slot, scan `GEAR` in catalog order, keep the best usable piece the player OWNS (in the satchel OR already worn). Ties resolve first-seen (matches `deriveStats`).
- Each equip is a pure inventory↔worn swap (displaced piece returns to the satchel) — conservation holds (worn is counted since 13e).
- Skips slots already wearing the best (no churn). Rejects mid-expedition. Returns `{ ok:false, reason:'no-upgrade' }` when nothing changes.
- Benchmark/NPCs never issue it → `worn` stays empty for them → **sim byte-identical** (seed 42/11/1337 hashes unchanged).

## Scope (in)
- `commands.ts`: union member + handler.
- `PlayerPanel.tsx`: "equip best" button (shown when the player owns ≥1 gear upgrade).
- Tests: engine equipBest (best-per-slot, swap returns old, level-gate, no-op, conservation) + UI button fires.

## Scope (out)
- Paperdoll grid (separate follow-up). Auto-equip on buy (explicit click only). Risking worn gear on death.

## Subsystems touched
- packages/engine/src/commands.ts
- packages/ui/src/components/PlayerPanel.tsx
- packages/engine/test/equipment.test.ts, packages/ui/test/app.test.tsx
- supabase/functions/verify-score/engine.js (rebuild)

## Gates
- [ ] equipBest conserves items (engine, checkInvariants)
- [ ] picks best usable per slot; no-op when nothing improves; rejects mid-expedition
- [ ] UI button fires the command
- [ ] SIM 42/11/1337 hashes UNCHANGED, 0 rejected, invariants OK
- [ ] Full engine + UI + e2e green; engine.js rebuilt
- [ ] verify-score redeploy flagged (batches with 12b + 13d + 13e)

## Open questions
- None — additive, mirrors the proven 13e equip path.
