# Phase: Exchange Wars — Phase 14t: RegionMap Selection Flash (Brick 176)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Builder (UI — game-feel / motion micro-interaction)
**Goal:** Pulse the RegionMap node when the selected region changes, so the eye lands on
where you're now aimed — especially after a Delve Log "raid again" jump sets the region
from another tab.
**Done condition:** Changing `selected` flashes the newly-selected node (a brief CSS
pulse); the first mount does NOT flash; suite + e2e green.

## Why this brick
12l lets you click a Delve Log row to re-raid a region — it switches to the Adventure tab
and sets `regionId`, but the RegionMap gives no spatial confirmation of WHERE you landed.
A short pulse on the selected node closes that loop with game-feel. Deliberately a fresh
subsystem (motion/UX) after a run of functional bricks; the frontend-design guidance favors
tasteful, high-impact micro-interactions.

## Tabs are mounted-but-hidden (the enabling fact)
Verified App.tsx:900 — all three rooms render unconditionally and hide via `.tabhidden`, so
RegionMap stays mounted across tab switches. A Delve Log jump therefore changes `selected` on
a LIVE component (not a remount), so a `useEffect([selected])` fires and we can cleanly skip
the first-mount flash. (This same check corrected the 14r FINDINGS #205 unmount claim.)

## Design — skip-mount effect + CSS keyframe
- RegionMap: a `flashing` boolean set true on `selected` change (a `mounted` ref skips the
  first run), cleared after 600ms (timeout, cleaned up). The selected node's `<g>` gets a
  `flash` class while flashing; the `.mapsel` ring runs a `@keyframes mapflash` scale/opacity
  pulse (transform-box: fill-box so it scales about its own centre).
- No prop/plumbing changes — reuses the existing `selected`; EmbarkPanel already re-points it
  on a regionPick, so the jump-from-log path flashes with no extra wiring.

## Scope (in)
- `RegionMap.tsx`: skip-mount flash effect + the `flash` class
- `styles.css`: `@keyframes mapflash` + `.mapnode.flash .mapsel`
- `app.test.tsx`: flash on change, no flash on mount

## Scope (out)
- No flash on the static initial region (mount-skip); no flash for locked-node clicks (ignored)
- No engine change

## Subsystems touched
- packages/ui/src/components/RegionMap.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [x] selection change adds `flash` to the selected node; first mount has none
- [x] UI suite (305, +1) + e2e (9) green; typecheck clean
- [x] UI-only — no engine change, no engine.js rebuild, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- 600ms duration is a feel guess; trivially tunable in CSS.

## Also in this commit (integrity)
- Corrected FINDINGS #205 (14r): tabs hide via `.tabhidden`, they do NOT unmount on switch —
  so the panel-unmount rationale was wrong; App-level baseline stands on centralization/
  robustness grounds. Verified against App.tsx:900.
