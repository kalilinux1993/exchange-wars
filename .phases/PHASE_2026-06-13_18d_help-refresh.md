# Phase: Exchange Wars — Phase 18d: Refresh the How-to-Play guide (it drifted behind the features) (Brick 264)

**Started:** 2026-06-13
**Hat:** Builder (onboarding/discoverability — keep the only guide accurate)
**Goal:** Update `HelpOverlay` so its sort/filter/keyboard lists match what actually ships: add **momentum**
to the market-sort list, **movers** (+ exotics/staples) to the filter-track list and the **compact** toggle,
and document the **Adventure** tab's keyboard nav (←/→ pick a region, Enter embarks) which was never listed.
**Done condition:** the guide names the momentum sort, the movers filter, and the embark keyboard nav; the
existing help tests still pass (substrings preserved) + new assertions cover the additions; suite green.

## Why this brick
The How-to-Play overlay (`?`) is the player's only guide, and it has drifted behind the session's work: the
sort list (margin/value-band/swing/volume) omits the **momentum** column (17o), the filter list
(flippable/cheap/steady/gear/watched) omits the **movers** track (17z) — and exotics/staples and the compact
toggle (17r) — and the keyboard section documents the Exchange keys (j/k, b/s, w, /) but never the Adventure
tab's ←/→ region nav + Enter-embarks (14w). A guide that understates the tools is a discoverability leak: the
player can't use a momentum sort or a movers filter they don't know exist. Refreshing it is the honest upkeep
that makes the features I've shipped actually findable. (A stale guide is worse than a thin one — it
silently caps what the player thinks the game offers.)

## Design — accurate text + guarded by tests
- `HelpOverlay.tsx`: sort sentence gains "momentum"; filter sentence gains "movers" (+ exotics/staples) and a
  clause on the **compact** toggle; the keyboard `<li>` gains "In Adventure, ←/→ pick a region and Enter
  embarks" (and Esc clears the filter / closes the guide). Preserve the substrings the current tests match
  ("margin, value-band, swing"; "flippable, cheap, steady").
- `app.test.tsx`: extend the decision-tools test to also match /momentum/ and /movers/; extend the keyboard
  test (or add one) to assert the Adventure embark keys are documented.

## Scope (in)
- `packages/ui/src/components/HelpOverlay.tsx`: accurate sort/filter/keyboard text
- `packages/ui/test/app.test.tsx`: extend the two help assertions for momentum/movers + the embark keys

## Scope (out)
- No new mechanic; no combat hotkeys (combat stays click-driven this brick); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/HelpOverlay.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] guide names the momentum sort, the movers filter (+ exotics/staples + compact), and the Adventure ←/→/Enter embark nav
- [x] existing help tests still pass (preserved "margin, value-band, swing" / "flippable, cheap, steady") + new /momentum/, /movers/, /pick a region and/ assertions
- [x] UI suite (431) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — this is accuracy upkeep over a static overlay; the only risk is test-substring drift, handled above.
