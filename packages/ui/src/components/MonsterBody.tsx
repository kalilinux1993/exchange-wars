import { monsterById } from '@exchange-wars/engine';

/** Deterministic hue from a monster id — same beast, same colour, forever. */
export function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

/**
 * The monster's archetype silhouette (shapes centred at 0,0), shared by the
 * combat scene and the bestiary portrait so they can never diverge. Form by
 * leech/dragonfire/hp: ooze / winged drake / brute / critter (9y), + elite
 * crown.
 */
export function MonsterBody({ monsterId }: { monsterId: string }) {
  const m = monsterById(monsterId);
  const hue = hueOf(monsterId);
  const form = (m.leech ?? 0) > 0 ? 'ooze' : m.dragonfire ? 'drake' : m.hp >= 55 ? 'brute' : 'critter';
  const fill = `hsl(${hue} 45% 32%)`;
  const stroke = `hsl(${hue} 55% 50%)`;
  const sw = 2;
  return (
    <>
      {form === 'drake' && (
        <>
          <polygon points="-4,-2 -26,-18 -20,6" style={{ fill, stroke, strokeWidth: sw }} />
          <polygon points="4,-2 26,-18 20,6" style={{ fill, stroke, strokeWidth: sw }} />
          <ellipse cx={0} cy={4} rx={17} ry={13} style={{ fill, stroke, strokeWidth: sw }} />
          <polygon points="6,-6 22,-20 16,-2" style={{ fill, stroke, strokeWidth: sw }} />
          <polygon points="14,-16 20,-28 22,-15" style={{ fill: '#e8643c' }} />
          <polygon points="22,8 34,16 20,14" style={{ fill, stroke, strokeWidth: sw }} />
          <circle cx={11} cy={-9} r={2.6} className="eye" />
        </>
      )}
      {form === 'brute' && (
        <>
          <rect x={-21} y={2} width={6} height={18} rx={3} style={{ fill, stroke, strokeWidth: sw }} />
          <rect x={15} y={2} width={6} height={18} rx={3} style={{ fill, stroke, strokeWidth: sw }} />
          <rect x={-16} y={-4} width={32} height={26} rx={8} style={{ fill, stroke, strokeWidth: sw }} />
          <ellipse cx={0} cy={-13} rx={9} ry={9} style={{ fill, stroke, strokeWidth: sw }} />
          <circle cx={-3.5} cy={-14} r={2.6} className="eye" />
          <circle cx={3.5} cy={-14} r={2.6} className="eye" />
        </>
      )}
      {form === 'ooze' && (
        <>
          <ellipse cx={0} cy={2} rx={20} ry={17} style={{ fill, stroke, strokeWidth: sw }} />
          <ellipse cx={0} cy={12} rx={22} ry={9} style={{ fill }} />
          <line x1={-18} y1={14} x2={-27} y2={24} className="tendril" />
          <line x1={18} y1={14} x2={27} y2={24} className="tendril" />
          <line x1={0} y1={20} x2={0} y2={32} className="tendril" />
          <circle cx={-7} cy={-3} r={3.2} className="eye" />
          <circle cx={7} cy={-3} r={3.2} className="eye" />
        </>
      )}
      {form === 'critter' && (
        <>
          <ellipse cx={0} cy={6} rx={13} ry={14} style={{ fill, stroke, strokeWidth: sw }} />
          <rect x={-8} y={18} width={5} height={6} rx={1} style={{ fill }} />
          <rect x={3} y={18} width={5} height={6} rx={1} style={{ fill }} />
          <circle cx={-4.5} cy={1} r={2.8} className="eye" />
          <circle cx={4.5} cy={1} r={2.8} className="eye" />
        </>
      )}
      {m.elite && (
        <text x={0} y={-30} textAnchor="middle" className="crown">
          ★
        </text>
      )}
    </>
  );
}

/** A standalone monster portrait for the Bestiary. */
export function MonsterGlyph({ monsterId, size = 26 }: { monsterId: string; size?: number }) {
  return (
    <svg className="monsterglyph" width={size} height={size} viewBox="-30 -34 60 64" role="img" aria-label={monsterById(monsterId).name}>
      <MonsterBody monsterId={monsterId} />
    </svg>
  );
}
