# Phase: Exchange Wars — Phase 16n: README accuracy — the UI package is the game, not "future" (Brick 222)

**Started:** 2026-06-12
**Closed:** 2026-06-12
**Hat:** Maintainer (public-facing accuracy)
**Goal:** Fix the material inaccuracies on the project's front door: the architecture diagram omits
`packages/ui` (the React frontend that IS the deployed game) and line 59 calls it "future Phase 4"; the
engine test-suite count is stale (14 → 19). A visitor reading the README today would conclude the game has
no UI yet, when it's the whole live product at the link in line 3.
**Done condition:** `packages/ui` appears in the architecture diagram with an accurate description; the
"future packages" framing no longer lists `ui`; the suite count reflects reality; docs-only gates green.

## Why this brick
After 24 bricks of UI/game growth this continuation (and the whole RPG/trading/social build before it), the
README's architecture section still shows only `engine/` + `cli/` and frames the UI as not-yet-built — the
single most misleading thing a discoverer could read about a project whose deployed game IS the UI. The
front door should describe the house that exists. Public-facing accuracy is genuine, non-padding value at
feature-saturation; this corrects a concrete misrepresentation, not generic doc-tidying.

## Design — targeted accuracy edits
- Add a `packages/ui/` block to the architecture diagram (React + Vite + TS over the engine via the
  command protocol; the trading cockpit + RPG HUD + cloud-save/PWA shell; `game.ts` pure UI helpers,
  `components/`, `test/app.test.tsx` + `e2e/`).
- Fix line 59: `packages/ui` is present (Phase 4 shipped); only `packages/server`-style backend remains
  future (cloud saves/leaderboard currently ride Supabase, noted).
- Update the engine `test/` count (14 → 19 suites) and the `DEV_GUIDE.md` pointer.

## Scope (in)
- `README.md`: the architecture `packages/ui` entry + the "future packages" line + the suite count

## Scope (out)
- No rewrite of the (accurate, well-written) "What's in the game" / economy / determinism sections; no new
  feature; no engine/UI code change

## Subsystems touched
- README.md (docs only)

## Gates
- [x] `packages/ui` added to the architecture diagram (THE GAME: React + Vite + TS over the engine; src/test breakdown)
- [x] the "future packages" line now states `packages/ui` is shipped + describes the Supabase backend; engine suite count 14 → 19; the share/brag feature added to the sharing bullet
- [x] typecheck clean (docs-only → no runtime change; suite/e2e skipped, code byte-identical)
- [x] docs-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — these are factual corrections to match the shipped repo.
