# Phase: Exchange Wars — Phase 18g: Adversarial review (18c–18f) + fix the death-stakes gate & Death Ward desync (Brick 267)

**Started:** 2026-06-13
**Hat:** Reviewer → Builder (quality gate: review 4 bricks, close 3 real findings)
**Goal:** Run the periodic adversarial review over 18c–18f and close the HIGH findings it surfaced — all in
18e / the pre-existing `deathRecap`:
  1. the in-dive death-stakes line gates on `packGp > 0`, but carried gear/food is at risk from the first
     step (it's in `exp.pack`, burned on death) before any kill mints loot gp — so a packed-but-unkilled
     diver has a real stake the line hides. Gate on actual loss (`lostGp > 0 || lostUnits > 0`).
  2. my 18e "hidden when no haul" test ratifies that bug (`pack:{shark:5}, packGp:0` asserts hidden, but
     5−keep3 = 2 units ARE at risk). Fix the test to a true nothing-at-stake case.
  3. `deathRecap` hardcodes keep-3, ignoring the `deathWard` upgrade (engine keeps `DEATH_KEEP_WARDED=5`) —
     a display/arbiter desync in BOTH the in-dive preview AND the death toast. Thread `keepN`.
**Done condition:** death-stakes shows whenever something is at stake (gear OR loot); `deathRecap` honors
Death Ward via a `keepN` param wired from `view.upgrades['deathWard']` in both callers; suite + e2e green.

## Why this brick
Review verdict: 18c (loadout ⚠ exactly mirrors `applyLoadout`'s clamp), 18d (every added help claim verified
true), 18f (hunt button never renders with a null target; mid-dive jump is a safe no-op) — all **SOUND**. But
18e shipped a wrong gate AND a test that ratified it, and exposed a latent `deathRecap`↔engine desync. These
are real (a 4+ item kit pre-first-kill is common: equip-best + a few foods), and the keep-3 hardcode means a
100k Death-Ward buyer is told they'll lose 2 more items than they will — in both the preview and the toast.
Display must agree with the arbiter (FINDINGS #47 principle). Verified against `commands.ts:159` (the engine's
`keepN = deathWard ? DEATH_KEEP_WARDED : DEATH_KEEP_BASE`, same cost-sort).

## Design — thread keepN, gate on loss
- `game.ts`: `deathRecap(items, pack, packGp, keepN = DEATH_KEEP_BASE)` — replace the hardcoded `3` with
  `keepN` (slice + `lostUnits`). Import `DEATH_KEEP_BASE` from the engine (single source for the default).
- `ExpeditionPanel.tsx`: `const keepN = (view.upgrades['deathWard'] ?? 0) > 0 ? DEATH_KEEP_WARDED : DEATH_KEEP_BASE`
  (imported from engine); pass to BOTH `deathRecap` calls (death toast :158 + in-dive line :493). Gate the
  in-dive line on `recap.lostGp > 0 || recap.lostUnits > 0` (compute recap first); update its copy to
  "your most valuable carried items (3, or 5 with a Death Ward)".
- `app.test.tsx`: fix the "hidden" test to a genuine nothing-at-stake pack (`{shark:2}, packGp:0` → 0 lost);
  add a `deathRecap` keepN unit (warded keeps 5, loses fewer); keep the "shows with loot" test (still valid).

## Scope (in)
- `packages/ui/src/game.ts`: `deathRecap` keepN param
- `packages/ui/src/components/ExpeditionPanel.tsx`: keepN wiring (both callers) + the loss-based gate + copy
- `packages/ui/test/app.test.tsx`: fix the ratifying test + a keepN unit + a "shows pre-kill gear stake" case

## Scope (out)
- No engine change (the engine is already correct); no new feature — this is a correctness fix; no redeploy

## Subsystems touched
- packages/ui/src/game.ts
- packages/ui/src/components/ExpeditionPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] death-stakes shows when gear is at risk pre-kill (pack:{shark:4}, packGp:0 → "lose 1 item"); hidden only when truly nothing at stake (shark:2/0)
- [x] `deathRecap` honors Death Ward (keepN=5) in both the in-dive line and the death toast; unit-pinned (keep-3 loses 3, keep-5 loses 1)
- [x] the ratifying 18e test is corrected (shark:2/0 → genuinely nothing lost)
- [x] UI suite (438, +2) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — verified against the engine death mechanic (commands.ts:159); the fix mirrors it exactly.
