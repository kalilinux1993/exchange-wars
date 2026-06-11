# Phase: Exchange Wars — Phase 9m: The Art Pipeline (Brick 39, Jesse-directed)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder + steward (Jesse: "rip some free art" + "this project is open source")
**Goal:** Make adding properly-licensed art safe and trivial, rather than fabricating/ripping. An Icon loader (Vite import.meta.glob auto-discovery of src/assets/icons/<name>.svg, emoji fallback), the license bookkeeping an open-source public deploy requires (CREDITS.md, assets README, README credits), skills strip wired as proof. Jesse picked game-icons.net (CC BY) + CC0 packs; literal OSRS/Jagex + CC BY-NC-SA Wiki art ruled out.
**Done condition:** loader + attribution scaffold shipped; fallback keeps tests green; suite + e2e green. **MET.**

## Outcome
- Icon.tsx: import.meta.glob('../assets/icons/*.svg') map; `<Icon name glyph>` renders the bundled SVG if present else the emoji — no manifest, no 404s, jsdom sees empty map (tests stay on fallback).
- CREDITS.md (CC BY attribution scaffold + explicit NOT-USED list), assets/icons/README.md (naming convention + license rules), README credits section.
- CharacterPanel skills strip routed through Icon (proof); monster/item/region follow when art lands.
- 187/187 unit (new fallback test); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #73.

## Gates
- [x] Fallback keeps all tests green (no committed assets yet)
- [x] Open-source licensing scaffolded (CREDITS + rules; OSRS/Jagex + NC art excluded in writing)
- [x] Suite + e2e green
