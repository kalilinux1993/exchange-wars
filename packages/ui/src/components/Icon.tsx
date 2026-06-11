/**
 * The art pipeline (9m). Drop a properly-licensed SVG into
 * `packages/ui/src/assets/icons/<name>.svg` and it is auto-bundled by Vite
 * and rendered here; until then, the emoji `glyph` shows. No manifest to
 * edit, no 404s (only files that EXIST enter the glob map), and jsdom/vitest
 * sees an empty map so the glyph fallback keeps every existing test green.
 *
 * Licensing (the repo is open-source + deployed publicly):
 *   - game-icons.net art is CC BY 3.0 — every icon used MUST be credited in
 *     CREDITS.md (author + icon).
 *   - CC0 / public-domain art needs no attribution, but list it anyway.
 *   - NEVER add Jagex/OSRS sprites or CC BY-NC-SA (OSRS Wiki) art.
 */
import { CONSUMABLES, GEAR } from '@exchange-wars/engine';

const ICON_URLS = import.meta.glob('../assets/icons/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<
  string,
  string
>;

/** Map an item id to a category icon (name + emoji fallback) — weapons/armor
 * reuse the skill icons, the rest are item-* originals; runes/bones by id. */
export function itemIcon(id: string): { name: string; glyph: string } {
  const g = GEAR[id];
  if (g) return g.slot === 'weapon' ? { name: 'skill-attack', glyph: '⚔' } : { name: 'skill-defence', glyph: '🛡' };
  const c = CONSUMABLES[id];
  if (c) return c.heal > 0 && !c.antifire && !c.boostAtk && !c.boostDef ? { name: 'item-food', glyph: '🍖' } : { name: 'item-potion', glyph: '⚗' };
  if (id.includes('bone')) return { name: 'item-bone', glyph: '🦴' };
  if (id.includes('rune')) return { name: 'item-rune', glyph: '🔮' };
  return { name: 'item-misc', glyph: '◆' }; // no asset → glyph fallback
}

export function iconUrl(name: string): string | undefined {
  return ICON_URLS[`../assets/icons/${name}.svg`];
}

export function Icon({
  name,
  glyph,
  size = 16,
  className,
}: {
  /** asset basename, e.g. "skill-attack" → src/assets/icons/skill-attack.svg */
  name: string;
  /** emoji/text shown until (or unless) the asset exists */
  glyph: string;
  size?: number;
  className?: string;
}) {
  const url = iconUrl(name);
  if (url) {
    return <img className={`icon ${className ?? ''}`} src={url} width={size} height={size} alt="" aria-hidden="true" />;
  }
  return (
    <span className={className} aria-hidden="true">
      {glyph}
    </span>
  );
}
