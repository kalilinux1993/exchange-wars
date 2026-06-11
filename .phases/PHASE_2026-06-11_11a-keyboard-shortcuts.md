# Phase: Exchange Wars — Phase 11a: Keyboard Shortcuts (Brick 79)

**Started:** 2026-06-11
**Closed:** 2026-06-11
**Hat:** Builder (input/UX — a power-user layer, breaking the data-surfacing run)
**Goal:** Cockpit keyboard shortcuts (1/2/3 rooms, p pause/play, ? help), guarded against typing/modifier chords, discoverable in the help overlay. UI-only, no engine change.
**Done condition:** pure `resolveShortcut` with tests; a guarded global keydown handler; shortcuts documented with `<kbd>`; suite + e2e green. **MET.**

## Outcome
- `keyboard.ts`: `resolveShortcut(key)` (pure) → `{kind:'room'|...}` for 1/2/3/p/?, null otherwise. `p` not Space so a focused button's Space-activation is never stolen.
- `App.tsx`: a `window` keydown effect that bails on `INPUT`/`SELECT`/`TEXTAREA`/contentEditable + ctrl/meta/alt, then dispatches `pickRoom` / `setSpeed(s=>s===0?1:0)` / `setHelpOpen(h=>!h)` (functional updaters → no stale closure under empty deps).
- `HelpOverlay.tsx` + `styles.css`: a "Keyboard" guide line with `<kbd>` keycaps (new `kbd` style) so the shortcuts are discoverable.
- Tests: pure `resolveShortcut` map + 2 render (1/2 switch rooms but a digit typed in the filter does not; `p` toggles 1×/❚❚). 243/243 unit (+3), 9/9 e2e. No engine change, no fn redeploy. FINDINGS #113.

## Gates
- [x] resolveShortcut maps the bound keys, null otherwise (pure test)
- [x] Keys switch rooms / pause; typing in a field is not hijacked (render tests)
- [x] Suite + e2e green
- [x] No engine change → verify-score redeploy not required
