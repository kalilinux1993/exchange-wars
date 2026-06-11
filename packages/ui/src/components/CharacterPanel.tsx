import { GEAR, levelsOf, maxHpFor, xpForLevel } from '@exchange-wars/engine';
import type { GearSlot } from '@exchange-wars/engine';
import type { AgentState } from '@exchange-wars/engine';

const SLOTS: { slot: GearSlot; label: string; x: number; y: number }[] = [
  { slot: 'helm', label: 'helm', x: 50, y: 16 },
  { slot: 'body', label: 'body', x: 50, y: 44 },
  { slot: 'weapon', label: 'weapon', x: 20, y: 44 },
  { slot: 'shield', label: 'shield', x: 80, y: 44 },
  { slot: 'legs', label: 'legs', x: 50, y: 74 },
];

/** Best USABLE item the player holds for each slot (mirrors deriveStats's
 * choice) — the paperdoll shows what they'd actually fight in. */
function equipped(
  inv: Record<string, number>,
  lvls: { atk: number; def: number },
): Partial<Record<GearSlot, string>> {
  const best: Partial<Record<GearSlot, { id: string; score: number }>> = {};
  for (const [id, qty] of Object.entries(inv)) {
    if (qty < 1) continue;
    const g = GEAR[id];
    if (!g) continue;
    if ((g.slot === 'weapon' ? lvls.atk : lvls.def) < g.req) continue;
    const score = g.atk + g.def;
    if (!best[g.slot] || score > best[g.slot]!.score) best[g.slot] = { id, score };
  }
  const out: Partial<Record<GearSlot, string>> = {};
  for (const [slot, v] of Object.entries(best)) out[slot as GearSlot] = v!.id;
  return out;
}

/**
 * The character sheet (9k): an OSRS-flavored paperdoll + a skills strip.
 * The figure's armor plates light up for each equipped slot; the skills
 * show Attack/Defence/Hitpoints with level and xp-to-next. Pure display.
 */
export function CharacterPanel({ agent, names }: { agent: AgentState | undefined; names: Map<string, string> }) {
  const lvls = levelsOf(agent?.combatXp);
  const trainedMax = maxHpFor(lvls.hp);
  const kit = equipped(agent?.inventory ?? {}, lvls);
  const hp = agent?.hp ?? trainedMax;
  const skill = (key: 'atk' | 'def' | 'hp', glyph: string, name: string) => {
    const lvl = lvls[key];
    const cur = agent?.combatXp?.[key] ?? 0;
    const into = lvl >= 99 ? 1 : (cur - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl));
    return (
      <div className="skillcell" title={`${name} ${lvl}`}>
        <span className="skillglyph">{glyph}</span>
        <span className="skilllvl">{lvl}</span>
        <span className="skillbar">
          <span style={{ width: `${Math.round(into * 100)}%` }} />
        </span>
      </div>
    );
  };
  return (
    <div className="character">
      <svg className="paperdoll" viewBox="0 0 100 96" role="img" aria-label="your adventurer">
        {/* body silhouette */}
        <ellipse cx={50} cy={10} rx={7} ry={8} className="doll-skin" />
        <rect x={40} y={20} width={20} height={26} rx={3} className={`doll-slot body${kit.body ? ' on' : ''}`} />
        <rect x={43} y={46} width={6} height={24} rx={2} className={`doll-slot legs${kit.legs ? ' on' : ''}`} />
        <rect x={51} y={46} width={6} height={24} rx={2} className={`doll-slot legs${kit.legs ? ' on' : ''}`} />
        <rect x={42} y={4} width={16} height={9} rx={3} className={`doll-slot helm${kit.helm ? ' on' : ''}`} />
        <rect x={26} y={26} width={8} height={22} rx={2} className={`doll-slot weapon${kit.weapon ? ' on' : ''}`} />
        <rect x={66} y={26} width={9} height={16} rx={2} className={`doll-slot shield${kit.shield ? ' on' : ''}`} />
      </svg>
      <div className="charside">
        <div className="equiplist">
          {SLOTS.map((s) => (
            <div key={s.slot} className={kit[s.slot] ? 'equip on' : 'equip'}>
              <span className="dim">{s.label}</span>
              <span>{kit[s.slot] ? (names.get(kit[s.slot]!) ?? kit[s.slot]) : '—'}</span>
            </div>
          ))}
        </div>
        <div className="skills">
          {skill('atk', '⚔', 'Attack')}
          {skill('def', '🛡', 'Defence')}
          {skill('hp', '♥', 'Hitpoints')}
        </div>
        <div className="hpline">
          <span className="dim">hp</span>
          <span className="hpbar mini">
            <span className="hpfill" style={{ width: `${Math.min(100, Math.round((hp / trainedMax) * 100))}%` }} />
          </span>
          <span className="num">
            {hp}/{trainedMax}
          </span>
        </div>
      </div>
    </div>
  );
}
