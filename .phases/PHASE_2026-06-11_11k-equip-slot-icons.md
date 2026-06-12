# Phase: Exchange Wars — Phase 11k: Equip-Slot Gear Icons (Brick 89)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (HUD polish — scannable gear sheet)
**Goal:** Show a per-slot gear icon before each worn item's name in the character sheet's equiplist, via the existing itemIcon pipeline. UI-only, live on main.
**Done condition:** worn slots render an icon; suite + e2e green. **MET.**

## Outcome
- `components/CharacterPanel.tsx`: import `itemIcon`; each worn equiplist slot renders `<Icon {...itemIcon(id)} size={14} className="equipicon" />` before the name. `itemIcon` returns `{name, glyph}` → spread (not `name={...}`).
- `styles.css`: `.equipicon` inline vertical-align.
- Tests: extended the 10w CharacterPanel render to assert `.equipicon` elements exist for the worn slots. 256/256 unit, 9/9 e2e. No engine change, no fn redeploy. FINDINGS #123.

## Notes
- `tsc` caught `name={itemIcon(id)}` (object vs string) before any test ran — typecheck-as-gate beats test-as-gate for shape errors.

## Gates
- [x] Worn slots show a gear icon (render test)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
