# Phase: Exchange Wars — Phase 9n: First Real Icons (original) (Brick 40)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (populate the 9m pipeline; route 2 — auto-fetch game-icons — proved impossible)
**Goal:** Put real icons in the wired skill slots. WebFetch markdown-converts pages (kills SVG path data), so game-icons.net auto-pull is off the table; author ORIGINAL sword/shield/heart SVGs as the default set instead — license-trivial, replaceable same-filename by a future CC BY/CC0 drop.
**Done condition:** 3 skill SVGs render via the glob in build + tests; CREDITS logs them; fallback still works for missing names; suite + e2e + prod build green. **MET.**

## Outcome
- skill-attack/defence/hitpoints.svg authored (hand-written, verifiable geometry); CREDITS "Original project art" section.
- Glob picks them up in Vite build (hashed/copied, 342ms) AND vitest (skills strip now renders 3 <img>); fallback test moved to a deliberately-missing name + a direct Icon render.
- 187/187 unit; 9/9 e2e; prod build clean. No engine change, no fn redeploy. FINDINGS #74.

## Gates
- [x] Icons render in build + tests; missing-name still falls back
- [x] Original art logged in CREDITS (replaceable note)
- [x] Suite + e2e + prod build green
