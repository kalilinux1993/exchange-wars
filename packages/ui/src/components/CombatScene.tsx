import { monsterById } from '@exchange-wars/engine';
import { useRef } from 'react';
import { MonsterBody } from './MonsterBody';

/**
 * The combat scene (9l): your adventurer faces a generated monster, hp bars
 * over each, hit-splats floating up on every round. Splats remount on a new
 * log entry (React keys are an animation system, FINDINGS #36) so the CSS
 * float-and-fade replays once per round. Pure display; the engine resolved
 * the round already.
 */
export interface FighterKit {
  weapon: boolean;
  helm: boolean;
  body: boolean;
  legs: boolean;
  shield: boolean;
}

/**
 * Per-region arena backdrop — a muted, dark-leaning gradient that gives each fight a
 * sense of place and makes the descent (soft plains → fiery Maw → light-eating Abyss)
 * visible mid-fight, not just labelled. Palettes are kept low and dark so the hp bars,
 * figures, and hit-splats stay legible on top. Unknown ids fall back to neutral stone.
 */
const ARENA_THEMES: Record<string, { from: string; to: string }> = {
  lumbridge_plains: { from: '#33402b', to: '#19200f' }, // mossy green hills
  varrock_sewers: { from: '#2a3326', to: '#13180f' }, // murky underground
  edgeville_dungeon: { from: '#343029', to: '#18150f' }, // stony, lamplit
  brimhaven_caverns: { from: '#2b362b', to: '#131a13' }, // moss & mould
  wilderness_ruins: { from: '#3a2a32', to: '#190f15' }, // ominous dusk, demons
  dragons_maw: { from: '#3c2c1c', to: '#1b1006' }, // ember & antifire
  inferno_gate: { from: '#46271a', to: '#1d0b07' }, // everything burns
  the_abyss: { from: '#2a1a33', to: '#0d0716' }, // void purple, eats light
};
const ARENA_DEFAULT = { from: '#2e2e2e', to: '#161616' };
export function arenaTheme(regionId?: string): { from: string; to: string } {
  return (regionId && ARENA_THEMES[regionId]) || ARENA_DEFAULT;
}

export function CombatScene({
  monsterId,
  monsterHp,
  playerHp,
  playerMaxHp,
  logLen,
  kit,
  regionId,
}: {
  monsterId: string;
  monsterHp: number;
  playerHp: number;
  playerMaxHp: number;
  logLen: number;
  /** Which equipment slots are filled with usable gear (lights the figure). */
  kit: FighterKit;
  /** The region you're fighting in — themes the backdrop. Falls back to neutral stone. */
  regionId?: string;
}) {
  const theme = arenaTheme(regionId);
  const m = monsterById(monsterId);
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
      {/* region-themed backdrop — a muted gradient that sets the mood of WHERE you fight,
          kept dark so the figures, hp bars, and splats stay legible on top. */}
      <defs>
        <linearGradient id="arena-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.from} />
          <stop offset="100%" stopColor={theme.to} />
        </linearGradient>
        {m.elite && (
          // A named elite gets a gold "boss" aura — gold core fading to transparent, pulsed by CSS.
          <radialGradient id="elite-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe08a" stopOpacity={0.5} />
            <stop offset="55%" stopColor="#d4a937" stopOpacity={0.22} />
            <stop offset="100%" stopColor="#d4a937" stopOpacity={0} />
          </radialGradient>
        )}
      </defs>
      <rect className="arena-bg" x={0} y={0} width={200} height={104} fill="url(#arena-sky)" />

      {/* arena floor — grounds the figures so they don't float */}
      <line x1={6} y1={96} x2={194} y2={96} className="ground" />
      <ellipse cx={52} cy={96} rx={26} ry={4} className="shadow" />
      <ellipse cx={150} cy={96} rx={24 * big} ry={4} className="shadow" />

      {/* hp bars */}
      <rect x={14} y={8} width={76} height={7} rx={2} className="scenehp-bg" />
      <rect x={14} y={8} width={(76 * pPct) / 100} height={7} rx={2} className="scenehp you" />
      <rect x={110} y={8} width={76} height={7} rx={2} className="scenehp-bg" />
      <rect x={110} y={8} width={(76 * mPct) / 100} height={7} rx={2} className="scenehp foe" />

      {/* the adventurer (left), feet on the floor (y≈96); each plate lights
          when that slot holds usable gear (mirrors the paperdoll). */}
      <g className="fighter">
        <rect x={46} y={66} width={6} height={30} rx={2} className={`doll-slot legs${kit.legs ? ' on' : ''}`} />
        <rect x={54} y={66} width={6} height={30} rx={2} className={`doll-slot legs${kit.legs ? ' on' : ''}`} />
        <rect x={42} y={42} width={22} height={28} rx={4} className={`doll-slot body${kit.body ? ' on' : ''}`} />
        <ellipse cx={53} cy={34} rx={9} ry={10} className="doll-skin" />
        <rect x={45} y={24} width={16} height={8} rx={3} className={`doll-slot helm${kit.helm ? ' on' : ''}`} />
        <rect x={64} y={36} width={5} height={34} rx={2} className={`doll-slot weapon${kit.weapon ? ' on' : ''}`} />
        <rect x={34} y={46} width={7} height={20} rx={2} className={`doll-slot shield${kit.shield ? ' on' : ''}`} />
      </g>

      {/* the monster (right), generated from its id + flags. The positioning
          transform lives on the OUTER <g> as an attribute; the bob animation
          on the INNER <g> — a CSS transform would otherwise CLOBBER the
          attribute transform and snap the monster to (0,0). */}
      <g transform={`translate(150 ${70 - (big - 1) * 6}) scale(${big})`}>
        {/* boss aura behind a named elite — centred on the body (MonsterBody is at 0,0, crown at y=-30),
            so it scales and tracks with the monster. Combat-only: MonsterBody/Bestiary stay clean. */}
        {m.elite && <ellipse className="elite-aura" cx={0} cy={-2} rx={30} ry={34} fill="url(#elite-glow)" />}
        <g className="monster">
          <MonsterBody monsterId={monsterId} />
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
