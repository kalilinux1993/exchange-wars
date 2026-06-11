# Phase: Exchange Wars — Phase 8r: Bring Antifire or Bring Regrets (Brick 18)

**Started:** 2026-06-11
**Hat:** Builder (content brick with a market hook — the Maw's flavor text becomes mechanics)
**Goal:** Dragonfire gets teeth: dragons add armor-piercing fire (+ceil(atk/2)) to every landed hit — def doesn't stop breath. Antifire NEGATES the fire (replacing the old "halve melee" semantic) and now lasts the whole EXPEDITION (flag on ExpeditionState; one ~17.3k potion per dive, amortized over its kills). Dragon farming gains an entry ticket that BURNS through the ledger — a real consumable sink coupling the Maw to the market.
**Done condition:** fire + expedition-antifire shipped with tests (fire delta exact, expedition persistence, dies-with-extract); grinder learns potion logistics; measured; fn redeployed; gates green.

## Scope (in)
- quest.ts: fire component in resolveRound, newCombat antifire seed param, ExpeditionState.antifire
- commands.ts: seed combats from exp.antifire; eatFood mirrors the flag to the expedition
- UI: antifire-active indicator in the field view
- tools/audit-grind.ts: potion shopping + drink-at-first-dragon policy; re-measure
- Tests: exact fire delta, expedition persistence, extract clears it

## Scope (out)
- Drinking outside combat (v2 nicety — "drink at camp")
- Encounter depletion / other tail levers

## Outcome
- Shipped: armor-piercing breath (+ceil(atk/2), antifire negates), expedition-long coating (ExpeditionState.antifire, seeded into every combat + mirrored on eat), UI dive indicator, harness potion logistics + region selection.
- Vorkanth became a flee-or-die reaper (auto-deepest policies ate 20–25 deaths) — correct for the end region; harness learned to farm d4 without the ticket.
- Final table (FINDINGS #52): naked +4–7k · geared +38–206k (0–14 deaths) · tail ~260k (down from 384k). 169/169 tests; fn redeployed (72.4kb).

## Gates
- [x] Suite green; fire delta asserted exactly (same-seed with/without comparison) — 169/169, delta = ceil(atk/2) to the point
- [x] Re-measure recorded (Maw tail should pay the ticket) — FINDINGS #52
- [x] fn rebuild + redeploy (combat semantics change)
