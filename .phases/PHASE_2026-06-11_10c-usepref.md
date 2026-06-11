# Phase: Exchange Wars — Phase 10c: usePref (Brick 55)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Refactorer (code health — dedupe the localStorage pref boilerplate, overdue)
**Goal:** A `usePref<T>(key, fallback)` hook collapsing the plain-JSON UI-prefs (loadouts, watch, alerts); behavior-preserving, guarded by existing tests.
**Done condition:** hook in use for the 3 JSON prefs, old helpers removed, all tests green. **MET.**

## Outcome
- usePref.ts (JSON localStorage hook). App: watch + alerts via usePref (value-setters). ExpeditionPanel: loadouts via usePref. Removed loadLoadouts/saveLoadouts/loadWatch/saveWatch/loadAlerts/saveAlerts from game.ts (~50 lines).
- ew-title (raw string) + ew-room (validated enum) intentionally NOT routed through it.
- 198/198 unchanged (the feature tests ARE the refactor proof) + 9/9 e2e. No engine change, no fn redeploy. FINDINGS #89.

## Gates
- [x] Behavior preserved (existing watch/loadouts/alerts/room tests green)
- [x] Dead helpers removed; typecheck clean
