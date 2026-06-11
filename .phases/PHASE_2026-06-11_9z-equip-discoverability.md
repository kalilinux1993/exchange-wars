# Phase: Exchange Wars — Phase 9z: "How do I equip?" (Brick 52, Jesse-reported)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Fixer (discoverability — Jesse: "I can't find a way to equip items")
**Goal:** Make the implicit equip mechanic (gear in the pack is auto-worn, best per slot) visible and actionable. No engine change.
**Done condition:** explainer + explicit equip action + a pointer where gear-buyers look; tests; suite + e2e green. **MET.**

## Outcome
- ExpeditionPanel: "Pack" → "Pack & Equip"; plain explainer ("gear you pack is worn automatically, best per slot; 🔒 inert until trained"); ⚔ equip best button (auto-packs best usable gear per slot, keeps food/brews).
- PlayerPanel (Ledger): when holding gear, a one-line pointer to the Adventure tab.
- 196/196 unit (equip-best packs the best usable weapon+body; test had to qualify levels first — rune gates at 12–14); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #86.

## Gates
- [x] Equip-best packs best usable gear (test)
- [x] Suite + e2e green
