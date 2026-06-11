# Phase: Exchange Wars — Phase 9j: Expedition Loadouts (Brick 36)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (QoL the deep kit system created — per-dive pack rebuild friction)
**Goal:** Save up to 4 expedition packs to localStorage; one-click refill clamped to current inventory; embark unchanged (still the command). Determinism-safe: loadouts are a UI preference, never in WorldState.
**Done condition:** save/apply/delete + label shipped; refill clamps to held; render test; suite + e2e green. **MET.**

## Outcome
- game.ts: loadLoadouts/saveLoadouts (localStorage 'ew-loadouts', cap 4, try/catch).
- ExpeditionPanel: loadouts row in the embark view — chips labeled by contents ("Shark ×2" / "Rune 2h sword +3"), click to refill (clamped), × to forget, "+ save kit" for the current draft.
- Refill clamps to held qty at apply (the loadout is a wish, the satchel is the law).
- 185/185 unit; 9/9 e2e. No engine change, no fn redeploy. FINDINGS #70.

## Gates
- [x] Loadouts never touch WorldState (localStorage only)
- [x] Refill clamps to current inventory (render test: build→save→clear→refill)
- [x] Suite + e2e green
