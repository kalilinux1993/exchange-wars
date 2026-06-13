# Phase: Exchange Wars — Phase 19y: loadGame must quarantine a parseable-but-unloadable save (not brick) (Brick 311)

**Started:** 2026-06-13
**Hat:** Builder (data-integrity — the same loadability gap as 19x, on the LOCAL load path; worse failure mode)
**Goal:** `loadGame` shares the shallow shape gate `importSaveString` HAD before 19x (checks `world` exists +
`playerId` numeric, then normalize). A parseable-but-unloadable local save (playerId points at no agent,
missing agents/books) passes the gate, doesn't throw → ISN'T quarantined → `loadGame` returns a half-baked
game → App renders → `playerView` null → "save corrupted" early-return with **NO recovery bar** (the recovery
UI only shows for QUARANTINED saves). So a subtly-broken local save BRICKS the app with no recovery — strictly
worse than malformed JSON (which IS quarantined + recoverable). Bring `loadGame` in sync with 19x's loadability
gate so such a save is quarantined (→ recovery bar + fresh start) instead of bricking.
**Done condition met:** yes — `loadGame` throws (→ quarantines → returns null) when the normalized save can't
produce a `playerView`; a malformed/wrong-shape save still quarantines; tests pin the new unloadable case;
suite + e2e green.

## Why this brick
Directly continues 19x: I hardened IMPORT loadability but left the symmetric LOCAL-load path with the same gap
— and its failure mode is worse (bricked-no-recovery vs import's "Import failed" toast). The quarantine machinery
already exists (CORRUPT_SAVE_KEY + the boot recovery bar, 10u); it just never fired for this class because the
save didn't THROW. Making the loadability check throw routes the broken save into the existing recover-or-discard
flow. Fifth surface in the "never silently lose / brick the player's progress" theme (19d/19r/19w/19x/19y).

## Design — add the loadability check inside loadGame's try
- `game.ts` `loadGame()`: after `const g = normalizeGame(parsed as Game)`, `if (!playerView(g.world,
  g.playerId)) throw new Error('save not loadable')` — the outer catch then quarantines to CORRUPT_SAVE_KEY +
  returns null (a throwing playerView on a malformed world is ALSO caught → quarantined). Update the
  shape-gate comment to note it now matches `importSaveString`'s loadability gate (19x/19y).

## Scope (in)
- `packages/ui/src/game.ts`: the `playerView` loadability throw in `loadGame`
- `packages/ui/test/app.test.tsx`: extend the quarantine test — a parseable-but-unloadable save quarantines (not bricks)

## Scope (out)
- No change to the recovery bar / quarantine storage (reused as-is); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/game.ts (loadGame)
- packages/ui/test/app.test.tsx

## Gates
- [ ] loadGame quarantines a parseable-but-unloadable save (returns null, CORRUPT_SAVE_KEY set); malformed/wrong-shape still quarantine; a real save still loads
- [ ] UI suite (extends the existing quarantine test) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy

## Open questions
- None — mirrors the verified 19x loadability gate; the quarantine/recovery flow already exists.
