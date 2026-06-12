# Phase: Exchange Wars — Phase 13e: Equipment Manager (User Feature Request) (Brick 135)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (engine+UI — the OSRS-style equipment manager the user asked for)
**Goal:** Let the player EQUIP gear from inventory into per-slot equipment that's worn in combat and safe on death. ENGINE+UI.
**Done condition:** equip/unequip commands; worn gear overrides the pack in combat + survives death; Equipment UI in PlayerPanel; benchmark/sim byte-identical; suite + e2e + sim green; engine.js rebuilt; redeploy flagged. **MET.**

## Why this brick
The user (after the 13d clerk fix) asked for "manually purchased items in an inventory, equipped to an equipment manager like OSRS." Today gear was "worn" only by packing it into an expedition. This adds a real, persistent equip system.

## Design — ADDITIVE, so it can't destabilise combat
The key constraint: don't break the deterministic combat/economy. So `worn` LAYERS on top of the existing pack system rather than replacing it:
- `AgentState.worn?: Record<slot, ItemId>` — equipped gear (plain JSON).
- `equip`/`unequip` commands: pure inventory↔worn moves (no mint/burn; conservation counts worn now). Level-gated (`GEAR.req`), gear-only, rejected mid-expedition. Equipping a full slot returns the old piece to inventory.
- `deriveStats(pack, lvls, worn?)`: worn gear OVERRIDES the pack per slot. **With `worn` absent/empty the result is byte-identical to before** — so every existing expedition test and the benchmark are unchanged.
- Worn gear is NOT in the expedition pack, so it's safe on death (you keep your equipment); the pack still holds consumables + any manually-packed gear (still at risk).
- `playerView` exposes `worn` for the UI.

Because the SIM/benchmark player never equips, `worn` stays empty for it → the sim is **byte-identical (seed-42 hash `fe75df57`, unchanged)**, 0 rejected, invariants OK. The economy and balance gates didn't move.

## Outcome
- `types.ts` / `commands.ts` / `quest.ts` / `invariants.ts`: the engine layer above.
- `PlayerPanel.tsx`: an "equip" chip on each gear stack (with the level req in its title) + an "Equipped" section listing worn gear per slot with "unequip"; updated the gear hint.
- Tests (+6): engine `equipment.test.ts` (equip↔unequip conserves items; slot swap returns the old piece; rejects not-owned/not-gear/level-too-low; `deriveStats` worn-override) + UI (PlayerPanel equips a gear stack; shows Equipped + unequip).
- `engine.js` rebuilt for the verifier.

## Gates
- [x] equip/unequip conserve items (engine, checkInvariants)
- [x] worn overrides pack; absent worn → identical (deriveStats test + 135 engine tests pass)
- [x] Equip UI fires the commands (render tests)
- [x] SIM 42 hash UNCHANGED (`fe75df57`), 0 rejected, invariants OK — benchmark unaffected
- [x] Full engine + UI + e2e green; engine.js rebuilt
- [ ] **verify-score redeploy PENDING** (replay-affecting: equip commands + deriveStats). Batches with 12b + 13d into the one deploy command.

## Follow-ups
- A proper OSRS paperdoll grid for the Equipment section (icons in slot layout) vs the current list.
- "auto-equip best" button (equip the best usable per slot in one click).
- Decide if deep-region death should risk worn gear (currently always safe).
