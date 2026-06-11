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
    <svg className="combatscene" viewBox="0 0 200 104" role="img" aria-label={`fighting ${m.name}`}>
      {/* arena floor — grounds the figures so they don't float */}
      <line x1={6} y1={96} x2={194} y2={96} className="ground" />
      <ellipse cx={52} cy={96} rx={26} ry={4} className="shadow" />
      <ellipse cx={150} cy={96} rx={24 * big} ry={4} className="shadow" />

      {/* hp bars */}
      <rect x={14} y={8} width={76} height={7} rx={2} className="scenehp-bg" />
      <rect x={14} y={8} width={(76 * pPct) / 100} height={7} rx={2} className="scenehp you" />
      <rect x={110} y={8} width={76} height={7} rx={2} className="scenehp-bg" />
      <rect x={110} y={8} width={(76 * mPct) / 100} height={7} rx={2} className="scenehp foe" />

      {/* the adventurer (left), feet on the floor (y≈96) */}
      <g className="fighter">
        <rect x={46} y={66} width={6} height={30} rx={2} className={geared ? 'doll-slot legs on' : 'doll-slot legs'} />
        <rect x={54} y={66} width={6} height={30} rx={2} className={geared ? 'doll-slot legs on' : 'doll-slot legs'} />
        <rect x={42} y={42} width={22} height={28} rx={4} className={geared ? 'doll-slot body on' : 'doll-slot body'} />
        <ellipse cx={53} cy={34} rx={9} ry={10} className="doll-skin" />
        <rect x={64} y={36} width={5} height={34} rx={2} className={geared ? 'doll-slot weapon on' : 'doll-slot weapon'} />
      </g>

      {/* the monster (right), generated from its id + flags. The positioning
          transform lives on the OUTER <g> as an attribute; the bob animation
          on the INNER <g> — a CSS transform would otherwise CLOBBER the
          attribute transform and snap the monster to (0,0). */}
      <g transform={`translate(150 ${70 - (big - 1) * 6}) scale(${big})`}>
        <g className="monster">
          <ellipse cx={0} cy={0} rx={20} ry={23} style={{ fill: `hsl(${hue} 45% 32%)`, stroke: `hsl(${hue} 55% 50%)`, strokeWidth: 2 }} />
          <circle cx={-7} cy={-5} r={3.2} className="eye" />
          <circle cx={7} cy={-5} r={3.2} className="eye" />
          {m.dragonfire && (
            <>
              <polygon points="-15,-18 -9,-28 -5,-16" style={{ fill: '#e8643c' }} />
              <polygon points="15,-18 9,-28 5,-16" style={{ fill: '#e8643c' }} />
            </>
          )}
          {(m.leech ?? 0) > 0 && (
            <>
              <line x1={-18} y1={13} x2={-27} y2={23} className="tendril" />
              <line x1={18} y1={13} x2={27} y2={23} className="tendril" />
              <line x1={0} y1={20} x2={0} y2={32} className="tendril" />
            </>
          )}
          {m.elite && <text x={0} y={-28} textAnchor="middle" className="crown">★</text>}
        </g>
      </g>

      {/* hit splats — keyed by log length so each round replays the float */}
      {ms && (
        <text key={`m${key}`} x={150} y={66} textAnchor="middle" className="splat foe">
          {ms}
        </text>
      )}
      {ps && (
        <text key={`p${key}`} x={53} y={40} textAnchor="middle" className={ps.startsWith('+') ? 'splat heal' : 'splat'}>
          {ps}
        </text>
      )}
    </svg>
  );
}
