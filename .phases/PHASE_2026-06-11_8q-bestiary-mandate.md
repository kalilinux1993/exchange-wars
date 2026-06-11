# Phase: Exchange Wars — Phase 8q: The Bestiary Mandate (Brick 17)

**Started:** 2026-06-11
**Hat:** Analyst→Tuner (FINDINGS #50 mandate: deep loot must repay gear + spread + death risk)
**Goal:** Geared raiding is underwater (3k–35k end worth). Suspect #1 is the HARNESS POLICY, not the economy: it buys the full kit at tick 0 — spread toll up front, gear inert until Attack 12–14 mid-sprint. Step 1: qualified-shopping policy (buy gear only once leveled to use it; optional fight-dragons toggle) and re-measure. Step 2: ONLY if still underwater, tune deep monster gp/drops minimally and re-measure. Target: geared-deep out-earns naked leveling without re-opening a printer.
**Done condition:** policy-vs-economy question answered with numbers; any loot tuning measured before/after; geared ≥ naked or the gap explained; fn redeployed IF engine touched; FINDINGS #51.

## Scope (in)
- tools/audit-grind.ts: qualified-shopping geared policy, fightDragons toggle
- quest.ts deep loot tuning ONLY if the policy fix isn't enough
- FINDINGS #51

## Scope (out)
- New regions/monsters (content brick, separate)
- Naked-meta changes (it's healthy)

## Outcome
- Harness was the first bug (rune-only wishlist → never qualified → fled everything tuned): ladder-climbing policy fixed it, kills 12→400 — the 8n gear ladder carries a full sprint arc.
- Economy tune landed on goods-over-coin: deep gp modest ([120–600]), drop chances up (helm 0.1, axe 0.12, blood 0.5, death 0.4, bones 0.25, kite 0.08) — the liquidation mark's finite bid depth caps the take (verified: bones rate halved left top routes bit-identical).
- Final table (FINDINGS #51): naked +4–7k · geared −13k…+130k w/ 9–22 deaths · TAS tail 150–384k (3–7×, under the 20× precedent). Encounter depletion queued as the structural tail-bound.
- 167/167; fn redeployed (72.1kb).

## Gates
- [x] Policy fix measured BEFORE any economy tuning — qualified-shopping measured (insufficient), ladder measured, THEN tuned
- [x] Any engine change = suite + fn redeploy — engine touched: 167/167 + redeploy done
- [x] Strategy table recorded — FINDINGS #51
