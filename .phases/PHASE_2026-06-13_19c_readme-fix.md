# Phase: Exchange Wars — Phase 19c: Fix stale README content (8 regions / 4 elites) (Brick 289)

**Started:** 2026-06-13
**Hat:** Scribe (public-facing accuracy — the repo's front door + GitHub link preview)
**Goal:** The README — the public landing + what a shared GitHub link previews — describes the game's content
inaccurately: "**seven-region** node graph, Lumbridge Plains to the Inferno Gate" and "**two** named elites
(Vorkanth, Zukrath)", but the engine has EIGHT regions (down to The Abyss) and FOUR named elites (Skarn,
Vorkanth, Zukrath, Vessith). Fix the counts/names against ground truth (quest.ts:151–163) + the stale test
count.
**Done condition met:** yes — README says eight regions to The Abyss, four named elites by name, and a
current test count; verified against the engine; no code touched.

## Why this brick
After the distribution arc (og 18z, loading 19a, install 19b), the remaining front-facing doc is the README
— the GitHub landing and the page a repo-link share previews. It's a strong README but stale on content:
quest.ts now defines 8 regions (added The Dragon's Maw + The Abyss; deepest is The Abyss, not the Inferno
Gate) and 4 named elites (the 16z apex-predator deed tracks all four), while the README says 7 regions / 2
elites. It also cites "(370+ cases)" (now 453). A public project's description should be accurate; a stale
front door undersells the game (and misleads anyone reading the repo). Verified the real numbers in the
engine (REGIONS 151–163: 8; elite monsters skarn/vorkanth/zukrath/vessith: 4) before editing.

## Design — correct the stale facts only
- `README.md`: "seven-region node graph, Lumbridge Plains to the Inferno Gate" → "eight-region ... to The
  Abyss"; "two named elites (Vorkanth, Zukrath)" → "four named elites (Skarn, Vorkanth, Zukrath, Vessith)";
  "death keeps your 3 most valuable carried items" → note the Death Ward 5; "(370+ cases)" → "450+ cases".
  Leave the (still-accurate) rest untouched.

## Scope (in)
- `README.md`: region count + deepest region, elite count + names, test-count, death-keep note

## Scope (out)
- No restructure/rewrite (it's a good README — only correct stale facts); no code change; no engine change → no redeploy

## Subsystems touched
- README.md

## Gates
- [x] README: eight regions to The Abyss; four named elites by name (Skarn/Vorkanth/Zukrath/Vessith) — verified vs quest.ts
- [x] test-count refreshed; no code touched (typecheck/suite unaffected)
- [x] no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — verified the counts/names against the engine (quest.ts:151–163).
