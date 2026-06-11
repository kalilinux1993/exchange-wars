# Phase: Exchange Wars — Phase 8n: Combat Stats & XP (Brick 14, Jesse-directed)

**Started:** 2026-06-11
**Hat:** Builder (Jesse: "we need higher attack for better weapons, higher defense for better armor. you decide how to implement")
**Goal:** Attack & Defence stats trained by combat (atk xp = damage dealt, def xp = damage taken; level = 1 + floor(sqrt(xp/4)), cap 99). Gear gains a req level in its governing stat (weapons→Attack, armor→Defence) enforced in deriveStats — under-leveled gear is inert. Catalog gear ladder widened (darts→staff→mystic→rune→dragon; chainbody/sq shield/plateskirts added). Level-ups speak in the journal. XP survives death.
**Done condition:** stats/xp/reqs shipped engine+UI with tests; audit re-measured (gating reshapes the geared meta); fn redeployed; gates green.

## Scope (in)
- engine: AgentState.combatXp, levelFor/levelsOf, GearDef.req, deriveStats gating, xp accrual + journal level-ups in the combat command
- GEAR ladder: ~7 new catalog items with reqs across tiers
- UI: stat line, req display + inert-gear greying in pack builder
- tools/audit-grind.ts: level-aware policy; re-measure
- Tests: curve, gating, accrual, death-keeps-xp; fix fixtures that assumed ungated gear

## Scope (out)
- Liquidation-value scoring (FINDINGS #47) — NEXT brick, unchanged priority
- Hitpoints level / maxHp growth — candidate after this lands

## Outcome
- Shipped: combatXp on the agent (atk = dmg dealt, def = dmg taken), sqrt curve to 99, req-gated deriveStats (single enforcement point), 20-item gear ladder (req 1–20, 9 new catalog items), journal level-ups, UI stat line + req display + inert greying.
- 164/164 tests (2 new: curve/gating + xp accrual); old saves = level 1; sims byte-identical (no field, no change).
- Audit: levels snowball (naked reaches d3–4); magnitudes paper-inflated — honest-mark brick sequenced FIRST before any bestiary tuning (FINDINGS #48).

## Gates
- [x] Full suite + typecheck; fn rebuild + redeploy (combat semantics change) — 164/164, fn 71.4kb deployed
- [x] Audit re-measured with the gate in place (FINDINGS numbers) — 5 seeds × 3 policies
- [x] Old saves degrade gracefully (absent xp = level 1; sims byte-identical) — levelsOf(undefined) tested
