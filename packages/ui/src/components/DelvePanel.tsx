import { REGIONS, regionIndex } from '@exchange-wars/engine';
import type { Game } from '../game';
import { fmtCompact, fmtDuration, recentDelves } from '../game';

/**
 * Delve Log (12i): a persistent chronicle of finished expeditions — the
 * adventure-loop analog of the trade history. The engine's expedition state
 * vanishes the moment you extract or die, so each completed dive (region, kills,
 * loot, survived/died) is latched into Game state when it ends. Newest first.
 */
export function DelvePanel({ game, limit = 8 }: { game: Game; limit?: number }) {
  const rows = recentDelves(game.delves, limit);
  const total = game.delves?.length ?? 0;
  return (
    <section className="panel delvelog">
      <h2>
        Delve Log {total > 0 && <span className="dim small">{total} logged</span>}
      </h2>
      {rows.length === 0 ? (
        <p className="dim small">no expeditions yet — finish a raid in the Adventure tab and it will chronicle here</p>
      ) : (
        <ul className="rows small">
          {rows.map((d, i) => {
            const region = REGIONS[regionIndex(d.regionId)]?.name ?? d.regionId;
            const ago = game.world.tick - d.tick;
            return (
              <li
                key={`${d.tick}-${i}`}
                className={d.died ? 'delve died' : 'delve survived'}
                title={`${d.died ? 'fell' : 'returned'} in ${region} · ${d.kills} cleared · ${d.lootGp.toLocaleString(
                  'en-US',
                )} loot gp ${d.died ? 'lost to the dark' : 'banked'}`}
              >
                <span>
                  {d.died ? '☠' : '🏆'} {region}
                </span>
                <span className="dim small">
                  {d.kills} kill{d.kills === 1 ? '' : 's'}
                </span>
                <span className={d.died ? 'pct down' : 'pct up'}>
                  {d.died ? '−' : '+'}
                  {fmtCompact(d.lootGp)}
                </span>
                <span className="dim small">{ago > 0 ? `${fmtDuration(ago)} ago` : 'just now'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
