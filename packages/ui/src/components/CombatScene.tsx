import { monsterById } from '@exchange-wars/engine';
import { useRef } from 'react';

/** Deterministic hue from a monster id — same beast, same colour, forever. */
function hueOf(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

/**
 * The combat scene (9l): your adventurer faces a generated monster, hp bars
 * over each, hit-splats floating up on every round. Splats remount on a new
 * log entry (React keys are an animation system, FINDINGS #36) so the CSS
 * float-and-fade replays once per round. Pure display; the engine resolved
 * the round already.
 */
export function CombatScene({
  monsterId,
  monsterHp,
  playerHp,
  playerMaxHp,
  logLen,
  geared,
}: {
  monsterId: string;
  monsterHp: number;
  playerHp: number;
  playerMaxHp: number;
  logLen: number;
  geared: boolean;
}) {
  const m = monsterById(monsterId);
  const hue = hueOf(monsterId);
  const ref = useRef({ p: playerHp, m: monsterHp, key: -1, ps: '', ms: '' });
  if (logLen !== ref.current.key) {
    const first = ref.current.key < 0;
    const dm = first ? 0 : ref.current.m - monsterHp; // damage dealt
    const dp = first ? 0 : ref.current.p - playerHp; // damage/heal to you
    ref.current = {
      p: playerHp,
      m: monsterHp,
      key: logLen,
      ps: dp > 0 ? `-${dp}` : dp < 0 ? `+${-dp}` : '',
      ms: dm > 0 ? `-${dm}` : '',
    };
  }
  const { key, ps, ms } = ref.current;
  const mPct = Math.round((Math.max(0, monsterHp) / m.hp) * 100);
  const pPct = Math.min(100, Math.round((Math.max(0, playerHp) / playerMaxHp) * 100));
  const big = m.elite ? 1.25 : 1;
  return (
    <svg className="combatscene" viewBox="0 0 200 96" role="img" aria-label={`fighting ${m.name}`}>
      {/* hp bars */}
      <rect x={10} y={6} width={70} height={6} className="scenehp-bg" />
      <rect x={10} y={6} width={(70 * pPct) / 100} height={6} className="scenehp you" />
      <rect x={120} y={6} width={70} height={6} className="scenehp-bg" />
      <rect x={120} y={6} width={(70 * mPct) / 100} height={6} className="scenehp foe" />

      {/* the adventurer (left) */}
      <g className="fighter">
        <ellipse cx={40} cy={40} rx={7} ry={8} className="doll-skin" />
        <rect x={31} y={50} width={18} height={24} rx={3} className={geared ? 'doll-slot body on' : 'doll-slot body'} />
        <rect x={20} y={50} width={6} height={20} rx={2} className={geared ? 'doll-slot weapon on' : 'doll-slot weapon'} />
      </g>

      {/* the monster (right), generated from its id + flags. The positioning
          transform lives on the OUTER <g> as an attribute; the bob animation
          on the INNER <g> — a CSS transform would otherwise CLOBBER the
          attribute transform and snap the monster to (0,0). */}
      <g transform={`translate(160 ${52 - (big - 1) * 20}) scale(${big})`}>
        <g className="monster">
          <ellipse cx={0} cy={0} rx={16} ry={18} style={{ fill: `hsl(${hue} 45% 32%)`, stroke: `hsl(${hue} 55% 50%)`, strokeWidth: 1.5 }} />
          <circle cx={-6} cy={-4} r={2.6} className="eye" />
          <circle cx={6} cy={-4} r={2.6} className="eye" />
          {m.dragonfire && (
            <>
              <polygon points="-12,-14 -7,-22 -4,-13" style={{ fill: '#e8643c' }} />
              <polygon points="12,-14 7,-22 4,-13" style={{ fill: '#e8643c' }} />
            </>
          )}
          {(m.leech ?? 0) > 0 && (
            <>
              <line x1={-14} y1={10} x2={-22} y2={18} className="tendril" />
              <line x1={14} y1={10} x2={22} y2={18} className="tendril" />
              <line x1={0} y1={16} x2={0} y2={26} className="tendril" />
            </>
          )}
          {m.elite && <text x={0} y={-22} textAnchor="middle" className="crown">★</text>}
        </g>
      </g>

      {/* hit splats — keyed by log length so each round replays the float */}
      {ms && (
        <text key={`m${key}`} x={160} y={48} textAnchor="middle" className="splat foe">
          {ms}
        </text>
      )}
      {ps && (
        <text key={`p${key}`} x={40} y={44} textAnchor="middle" className={ps.startsWith('+') ? 'splat heal' : 'splat'}>
          {ps}
        </text>
      )}
    </svg>
  );
}
