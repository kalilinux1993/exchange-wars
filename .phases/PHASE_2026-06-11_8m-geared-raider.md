# Phase: Exchange Wars — Phase 8m: The Geared Raider (Brick 13)

**Started:** 2026-06-11
**Hat:** Analyst (close the FINDINGS #46 open datum before any tuning or new content)
**Goal:** Measure whether gear investment is now the best raiding strategy. Extend tools/audit-grind.ts with a geared policy — shop the books while resting (buy commands are tick-free; fills arrive while wounds mend), embark armored with food, fight deeper. Compare naked vs geared vs clerk-trade vs idle across 5 seeds via verifySprint.
**Done condition:** geared-grind measured honestly; FINDINGS verdict written; mechanics touched ONLY if the market→expedition capital loop is broken (geared < naked would mean gear isn't worth buying — a design failure); gates green. **MET** (loop validated; the audit also exposed a printer, fixed in-phase per the 8k precedent).

## Outcome
- Capital loop VALIDATED: median geared ≈ +16.6k vs naked +1–3.9k, depth 4–5 vs 0–2.
- Printer found: green dragon bones (16.7k baseCost) at 100% → routed line scored 1.62M. Faucet nerfed to 0.15 (Vorkanth keeps 1.0). Post-nerf the same line still marks 636k — decomposed to 10.5k cash + ~590k paper marks on unsold loot in thin books: scoring semantics, NOT loot rates. Liquidation-value scoring queued as the next brick (with the self-bid-pump exploit pre-identified).
- 162/162 tests; loot seed-stability test moved to Vorkanth; fn rebuilt (69.7kb) + redeployed.

## Scope (in)
- tools/audit-grind.ts: geared policy (shop-while-resting, gear-aware flee list, eat thresholds)
- FINDINGS #47 with numbers + verdict

## Scope (out)
- New content (events/durability/bestiary) — next brick
- Loot/TUNING changes unless the verdict demands them

## Gates
- [x] Measurement honest (verifySprint-scored, 5 seeds, same harness as #45/#46) — naked/geared15/geared35/clerk/idle, plus composition debug (--debug)
- [x] Any mechanic shipped = full gates + fn redeploy; else docs-only — bones 0.15 shipped: 162/162, fn redeployed
