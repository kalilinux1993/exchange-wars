# Phase: Exchange Wars — Phase 18j: Quantify XP-to-next on the skill bars (Brick 270)

**Started:** 2026-06-13
**Hat:** Builder (progression — make the existing skill bar readable)
**Goal:** The CharacterPanel skill cells draw an XP progress bar but with no value — the tooltip is just
"Attack 40". Enrich it to "Attack 40 · 62% to 41 · 1,240 xp to go" (maxed → "maxed (99)") so the player can
see how close they are to the next combat level, which gates the next gear tier.
**Done condition:** each skill tooltip shows the % and the actual XP remaining to the next level; a maxed
skill reads "maxed"; suite + e2e green.

## Why this brick
Combat levels unlock gear tiers (darts→staff→mystic→rune→dragon), so "how close am I to the next level?" is a
core RPG question — but the skill bar (`into`, the fraction into the current level) is drawn with no number,
so the player sees "some progress" and can't tell 5% from 95% without eyeballing a tiny bar. The data is all
present (`xpForLevel`, the agent's `combatXp`); surfacing the % AND the concrete xp-to-go in the tooltip makes
the bar quantitative and names the grind remaining. Small, but it completes a readout that was half-built.

## Design — enrich the skill tooltip
- `CharacterPanel.tsx` `skill()` helper: compute `maxed = lvl >= 99`, keep `into`, add
  `toNext = xpForLevel(lvl+1) − cur`; the skillcell title becomes `${name} ${lvl} · ${maxed ? 'maxed (99)' :
  `${round(into*100)}% to ${lvl+1} · ${toNext} xp to go`}`; also title the bar itself with the progress.

## Scope (in)
- `packages/ui/src/components/CharacterPanel.tsx`: the quantified skill tooltip
- `packages/ui/test/app.test.tsx`: a render test (progress % + xp-to-go in the tooltip; maxed reads "maxed")

## Scope (out)
- No visible inline number in the compact strip (the detail rides the tooltip, matching the panel's convention); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/CharacterPanel.tsx
- packages/ui/test/app.test.tsx

## Gates
- [x] each skill tooltip shows "{N}% to {lvl+1} · {xp} xp to go" (render test); a maxed (99) skill reads "maxed"
- [x] UI suite (442, +2) + e2e (10) green; typecheck clean
- [x] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — `into` was already computed; this surfaces its value + the xp-to-go from `xpForLevel`.
