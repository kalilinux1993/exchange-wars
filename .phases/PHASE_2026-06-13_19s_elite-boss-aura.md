# Phase: Exchange Wars — Phase 19s: a boss aura for named elites in the combat scene (Brick 305)

**Started:** 2026-06-13
**Hat:** Builder (game-feel — make the climax fights LOOK like a climax; frontend-design "high-impact moment")
**Goal:** The 4 named elites (Skarn, Vorkanth, Zukrath, Vessith) are the hardest fights and best loot, but in
the combat scene they read as just a slightly-bigger monster (1.25× scale + the shared ★ crown). Add a
combat-only pulsing GOLD aura behind an elite so a boss fight feels like one — without touching the shared
`MonsterBody` (so the Bestiary glyph stays a clean silhouette).
**Done condition met:** yes — when `m.elite`, the CombatScene renders a soft radial gold aura (a `<defs>`
radial gradient + an `.elite-aura` ellipse behind the monster) that pulses via CSS opacity; ordinary foes get
none; a render test pins both; suite + e2e green; typecheck clean.

## Why this brick
The named elites are the game's payoff moments — the survivability ladder (19f/g/m) and the death-stakes all
build toward them. A distinctive visual makes the encounter feel earned (the frontend-design principle: one
well-orchestrated high-impact moment beats scattered micro-effects). It's combat-scene-only and SVG/CSS, so
zero engine/replay risk, and it deliberately does NOT touch `MonsterBody` (shared with the Bestiary, where a
calm silhouette is right). The aura tracks the monster (lives inside its scaled `<g>`), gold = the game's
"valuable/special" accent.

## Design — a radial-gradient aura behind the elite, CSS-pulsed
- `CombatScene.tsx`: in `<defs>`, when `m.elite`, add a `radialGradient#elite-glow` (gold core → transparent
  edge). In the monster's scaled outer `<g>`, BEFORE the `<g className="monster">`, render
  `<ellipse className="elite-aura" cx={0} cy={-2} rx={30} ry={34} fill="url(#elite-glow)" />` — centred on the
  body (MonsterBody is centred at 0,0; crown at y=-30), so it scales/tracks with the monster.
- `styles.css`: `.combatscene .elite-aura { animation: elite-pulse 2.6s ease-in-out infinite; }` +
  `@keyframes elite-pulse { 0%,100% { opacity: .45 } 50% { opacity: .9 } }` (opacity-only — no transform, so it
  can't clobber the monster `<g>`'s attribute transform, per the FINDINGS #note already in this file).

## Scope (in)
- `packages/ui/src/components/CombatScene.tsx`: the `<defs>` gradient + the aura ellipse (gated on `m.elite`)
- `packages/ui/src/styles.css`: `.elite-aura` pulse
- `packages/ui/test/app.test.tsx`: render test — elite foe → `.elite-aura` present; ordinary foe → absent

## Scope (out)
- No change to `MonsterBody` / the ★ crown (shared with the Bestiary — keep its silhouette calm); no per-elite
  unique art (one gold boss aura for all 4 named elites); no engine change → no redeploy

## Subsystems touched
- packages/ui/src/components/CombatScene.tsx
- packages/ui/src/styles.css
- packages/ui/test/app.test.tsx

## Gates
- [ ] CombatScene renders `.elite-aura` for an elite foe (skarn) and none for an ordinary foe (goblin) — render test
- [ ] opacity-only pulse (no transform clobber); aura sits behind the monster, scales with it
- [ ] UI suite (+1) + e2e (13) green; typecheck clean
- [ ] UI-only — no engine change, no redeploy (batch stays 12b+13d+13e+13f+13r+14j)

## Open questions
- None — purely additive combat-scene SVG/CSS.
