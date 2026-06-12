import { REGIONS, regionIndex } from '@exchange-wars/engine';
import type { Game } from '../game';
import { diveStreak, fmtCompact, fmtDuration, raidTotals, raidTotalsByRegion, recentDelves } from '../game';

/**
 * Delve Log (12i): a persistent chronicle of finished expeditions — the
 * adventure-loop analog of the trade history. The engine's expedition state
 * vanishes the moment you extract or die, so each completed dive (region, kills,
 * loot, survived/died) is latched into Game state when it ends. Newest first.
 */
export function DelvePanel({
  game,
  limit = 8,
  onPick,
}: {
  game: Game;
  limit?: number;
  /** Click a row to jump to that region on the Adventure tab ("raid here again"). */
  onPick?: (regionId: string) => void;
}) {
  const rows = recentDelves(game.delves, limit);
  const t = raidTotals(game.delves);
  const byRegion = raidTotalsByRegion(game.delves);
  const streak = diveStreak(game.delves);
  return (
    <section className="panel delvelog">
      <h2>
        Delve Log{' '}
        {t.runs > 0 && (
          <span
            className="dim small"
            title="loot gp kept from delves you survived vs forfeited to the dark on deaths — your raiding risk/reward, the counterpart to trading realized profit"
          >
            {t.runs} run{t.runs === 1 ? '' : 's'} · <b className="pct up">{fmtCompact(t.banked)}</b> banked
            {t.lost > 0 && (
              <>
                {' · '}
                <b className="pct down">{fmtCompact(t.lost)}</b> lost
              </>
            )}
          </span>
        )}
        {streak.best > 0 && (
          <span
            className="dim small divestreak"
            title="dives survived in a row right now (and your best run ever) — a death breaks the streak; the careful-extraction reward"
          >
            {' · '}
            <b className={streak.current > 0 ? 'pct up' : 'dim'}>🔥 {streak.current} clean</b>
            {streak.best > streak.current && <span className="dim"> (best {streak.best})</span>}
          </span>
        )}
      </h2>
      {byRegion.length >= 2 && (
        <div className="raidbyregion">
          <span className="dim small">by region — best farm first:</span>
          <ul className="rows small">
            {byRegion.map((r) => {
              const name = REGIONS[regionIndex(r.regionId)]?.name ?? r.regionId;
              return (
                <li
                  key={r.regionId}
                  className="raidregion"
                  title={`${name}: ${r.runs} run${r.runs === 1 ? '' : 's'}, ${r.deaths} death${r.deaths === 1 ? '' : 's'} · ${r.banked.toLocaleString('en-US')} banked − ${r.lost.toLocaleString('en-US')} lost`}
                >
                  <span>{name}</span>
                  <span className="dim small">
                    {r.runs}r{r.deaths > 0 ? ` · ${r.deaths}☠` : ''}
                  </span>
                  <span className={r.net >= 0 ? 'pct up' : 'pct down'}>
                    {r.net >= 0 ? '+' : '−'}
                    {fmtCompact(Math.abs(r.net))} net
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
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
                className={`${d.died ? 'delve died' : 'delve survived'}${onPick ? ' mover' : ''}`}
                onClick={onPick ? () => onPick(d.regionId) : undefined}
                title={`${d.died ? 'fell' : 'returned'} in ${region} · ${d.kills} cleared · ${d.lootGp.toLocaleString(
                  'en-US',
                )} loot gp ${d.died ? 'lost to the dark' : 'banked'}${onPick ? ' — click to raid here again' : ''}`}
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
