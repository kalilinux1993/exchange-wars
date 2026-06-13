# Phase: Exchange Wars — Phase 19x: import must reject an unloadable save before clobbering the current run (Brick 310)

**Started:** 2026-06-13
**Hat:** Builder (validate untrusted input + don't lose progress — the data-integrity theme, import surface)
**Goal:** `importSaveString` validates only that `world` exists and `playerId` is a number — a shallow check. A
parseable-but-structurally-broken save (e.g., `playerId` points at no agent, or `agents`/`books` missing)
passes, and `importFile` then REPLACES the current game (local + cloud via schedulePush) before the app
discovers it can't render it ("save corrupted"). So a bad import clobbers a good run. Gate the import on actual
LOADABILITY (a successful `playerView`) so a broken import is rejected BEFORE it can replace anything.
**Done condition met:** yes — `importSaveString` returns null when the normalized save can't produce a
`playerView` (wrapped in the existing try/catch, so a throwing playerView is also rejected); `importFile`
already turns null into an "Import failed" toast with no clobber; tests pin a real round-trip + rejection of
malformed/no-world/unloadable inputs; suite + e2e green.

## Why this brick
Continues the 19w cloud / 19r offline / 19d sync "never silently lose the player's progress" theme, on the
import surface. The clear, unambiguous part: a save the app CANNOT load should never be allowed to overwrite a
save it can — reject it at the parse boundary, where `importFile` already handles null gracefully. (The
separate, AMBIGUOUS question — should a *valid* import warn before replacing a run-with-progress, like new-game
14x does? — is left to Jesse as a product call; import's intent is "load this", unlike new-game's.)

## Design — a loadability gate in importSaveString
- `game.ts` `importSaveString(raw)`: after `normalizeGame(g)`, `if (!playerView(normalized.world,
  normalized.playerId)) return null;` (inside the existing try/catch, so a malformed world that makes
  playerView THROW is caught → null too). `playerView` is already imported in game.ts.

## Scope (in)
- `packages/ui/src/game.ts`: the `playerView` loadability gate in `importSaveString`
- `packages/ui/test/app.test.tsx`: extend the round-trip test — reject an unloadable (bad-playerId) save; keep the real round-trip + malformed/no-world rejections

## Scope (out)
- No confirm-before-replace UI for a VALID import (ambiguous intent — flagged for Jesse alongside the 19w
  conflict-policy note); no change to `importFile` (it already handles null); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/test/app.test.tsx

## Gates
- [ ] importSaveString rejects malformed / no-world / unloadable (bad-playerId) saves; accepts a real export round-trip
- [ ] a rejected import does not clobber (importFile → "Import failed" on null — unchanged)
- [ ] UI suite (+~0, extends the existing test) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy

## Open questions
- Flagged for Jesse: should a VALID import warn before replacing a run-with-progress (new-game 14x parity)? Product call — import's intent is "load this save", so left unguarded for now.
