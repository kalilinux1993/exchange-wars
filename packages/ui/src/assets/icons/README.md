# Icon assets

Drop properly-licensed SVGs here as `<name>.svg`; the `Icon` component
(`src/components/Icon.tsx`) auto-discovers them via `import.meta.glob` — no
manifest, no wiring. Until a file exists, the emoji fallback shows.

## Naming convention (what the code looks for)

- Skills: `skill-attack.svg`, `skill-defence.svg`, `skill-hitpoints.svg`
- Monsters: `monster-<id>.svg` (ids in `packages/engine/src/quest.ts` MONSTERS — e.g. `monster-goblin.svg`, `monster-green_dragon.svg`)
- Items: `item-<id>.svg` (e.g. `item-shark.svg`, `item-rune_2h_sword.svg`)
- Regions: `region-<id>.svg`

## Licensing rules (this repo is open-source + deployed publicly)

- **game-icons.net** — CC BY 3.0. Allowed. **You MUST add the author + icon
  name to `/CREDITS.md`.** Single-path SVGs, perfect for these slots.
- **CC0 / public domain** (Kenney.nl, OpenGameArt CC0) — allowed, no
  attribution required; list provenance in `/CREDITS.md` anyway.
- **NEVER**: Jagex/OSRS game sprites (copyright) or OSRS Wiki art
  (CC BY-NC-SA — non-commercial + share-alike, incompatible here).

## Two-minute populate

1. Find an icon at game-icons.net (or a CC0 pack), download the SVG.
2. Save it here with the matching name (above).
3. Add one line to `/CREDITS.md`.
4. `npm run build` — it appears; the emoji fallback retires automatically.
