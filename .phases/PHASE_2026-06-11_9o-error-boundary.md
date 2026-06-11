# Phase: Exchange Wars — Phase 9o: The Lifeboat (Brick 41)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (robustness — Jesse asked for it; a render throw white-screened the whole game)
**Goal:** An app-level React error boundary that catches render/lifecycle crashes (real risk: monsterById throws on unknown ids, so a long-lived save across a future catalog change could brick the UI), shows a recovery card (reload + copy-save-to-clipboard), and never touches the world (save stays the source of truth).
**Done condition:** boundary wraps App; catches a thrown child; save untouched; suite + e2e green. **MET.**

## Outcome
- ErrorBoundary.tsx (class component, getDerivedStateFromError + componentDidCatch logging); recovery card reuses the .scrim/.panel.help styling; copySave reads SAVE_KEY to clipboard.
- main.tsx wraps <App/>.
- Scope note: catches render path only, not event-handler throws — but render (CombatScene/RegionMap/monsterById) was the white-screen risk.
- 188/188 unit (boundary test: catches a Boom child, recovery UI shows, save bytes unchanged); 9/9 e2e. No engine change, no fn redeploy. FINDINGS #75.

## Gates
- [x] Catches a render throw, shows recovery, save untouched (test)
- [x] Suite + e2e green
