import { REGIONS } from '@exchange-wars/engine';
import type { Game } from '../game';
import { regionMastery } from '../game';

/**
 * Region Conquest (12f): per-region monster-mastery completion — for each of the
 * realm's regions, how much of its native roster (encounter pool + named elite)
 * you've slain at least once, with a 👑 once every foe there has fallen. The
 * 100%-completion hook the flat bestiary never gave: a concrete per-region target
 * to chase, distinct from merely unlocking past a region. Reads killsByMonster.
 */
export function ConquestPanel({ game }: { game: Game }) {
  const kills = game.world.stats.killsByMonster;
  const rows = REGIONS.map((region) => ({ region, m: regionMastery(region, kills) }));
  const mastered = rows.filter((r) => r.m.done).length;
  return (
    <section className="panel conquest">
      <h2>
        Region Conquest{' '}
        <span className="dim small">
          {mastered}/{REGIONS.length} mastered
        </span>
      </h2>
      <ul className="rows small">
        {rows.map(({ region, m }) => (
          <li
            key={region.id}
            className={m.done ? 'conquest-row done' : 'conquest-row'}
            title={`${m.slain} of ${m.total} native foes slain in ${region.name}${m.done ? ' — fully conquered' : ''}`}
          >
            <span>
              {m.done ? '👑 ' : ''}
              {region.name}
            </span>
            <span className="conquestbar" aria-hidden="true">
              <span style={{ width: `${m.total > 0 ? Math.round((m.slain / m.total) * 100) : 0}%` }} />
            </span>
            <span className={m.done ? 'pct up' : 'dim small'}>
              {m.slain}/{m.total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
