import { monsterById, REGIONS } from '@exchange-wars/engine';

/**
 * The realm as a node-graph map (9k): eight regions on a winding trail,
 * plains in the green to the Abyss in the dark. A node is conquered (✓),
 * the frontier (⚑), or locked (🔒); click an unlocked node to choose it.
 * Region names render as <text> so they stay queryable + accessible.
 */
export function RegionMap({
  progress,
  selected,
  onSelect,
}: {
  progress: number;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const W = 320;
  const H = 150;
  // Winding trail: alternate high/low across the width.
  const n = REGIONS.length;
  const pts = REGIONS.map((_, i) => ({
    x: 24 + (i * (W - 48)) / (n - 1),
    y: i % 2 === 0 ? 96 : 48,
  }));
  return (
    <svg className="regionmap" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="region map">
      {/* the trail */}
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke="#5b4a25"
        strokeWidth={2}
        strokeDasharray="4 3"
      />
      {REGIONS.map((r, i) => {
        const p = pts[i]!;
        const state = i > progress ? 'locked' : i === progress ? 'frontier' : 'cleared';
        const isSel = selected === r.id;
        const mark = state === 'locked' ? '🔒' : state === 'frontier' ? '⚑' : '✓';
        return (
          <g
            key={r.id}
            className={`mapnode ${state}${isSel ? ' selected' : ''}`}
            onClick={() => i <= progress && onSelect(r.id)}
            style={{ cursor: i <= progress ? 'pointer' : 'not-allowed' }}
          >
            {isSel && <circle cx={p.x} cy={p.y} r={13} className="mapsel" fill="none" />}
            <circle cx={p.x} cy={p.y} r={9} />
            <text x={p.x} y={p.y + 3} className="mapmark" textAnchor="middle">
              {r.elite ? '★' : mark}
            </text>
            <text x={p.x} y={p.y + (i % 2 === 0 ? 24 : -16)} className="maplabel" textAnchor="middle">
              {r.name}
            </text>
            <title>
              {r.name} — {r.flavor}
              {r.elite ? ` (${monsterById(r.elite).name} stalks here)` : ''}
            </title>
          </g>
        );
      })}
    </svg>
  );
}
