import type { PlayerView } from '@exchange-wars/engine';
import { fmtDuration, MILESTONES, type Game } from '../game';

export function MilestonesPanel({
  unlocked,
  game,
  view,
  worth,
}: {
  unlocked: string[];
  game: Game;
  view: PlayerView;
  worth: number;
}) {
  const got = unlocked.length;
  // OSRS-style: a compact badge grid (icon + tooltip) instead of a 31-line
  // wall (9k). Closest-to-done unearned deeds float up so there's always a
  // visible "next goal"; the rest collapse behind a count.
  const ranked = MILESTONES.map((m) => {
    const done = unlocked.includes(m.id);
    const pct = !done && m.progress ? Math.min(99, Math.floor(m.progress(game, view, worth) * 100)) : 0;
    return { m, done, pct };
  });
  const next = ranked.filter((r) => !r.done).sort((a, b) => b.pct - a.pct).slice(0, 3);
  // The most-recently-earned deed (of those stamped) — a sense of run pacing.
  const ticks = game.milestoneTicks ?? {};
  const latest = unlocked
    .filter((id) => ticks[id] !== undefined)
    .map((id) => ({ m: MILESTONES.find((x) => x.id === id), tick: ticks[id]! }))
    .filter((e) => e.m !== undefined)
    .sort((a, b) => b.tick - a.tick)[0];
  return (
    <section className="panel milestones">
      <h2>
        Deeds{' '}
        <span className="dim">
          {got}/{MILESTONES.length}
        </span>
      </h2>
      <div className="deedgrid" title="every deed — filled badges are earned; hover for the tale">
        {ranked.map(({ m, done, pct }) => (
          <span
            key={m.id}
            className={done ? 'deedbadge got' : 'deedbadge'}
            title={done ? `${m.name} — ${m.flavor}` : `${m.name}${pct > 0 ? ` · ${pct}%` : ' · locked'}`}
          >
            {done ? '◆' : '◇'}
          </span>
        ))}
      </div>
      {latest && (
        <p className="dim small" title={latest.m!.flavor}>
          🏅 latest: <b>{latest.m!.name}</b> · {fmtDuration(Math.max(0, game.world.tick - latest.tick))} ago
        </p>
      )}
      {next.length > 0 && (
        <ul className="rows small">
          {next.map(({ m, pct }) => (
            <li key={m.id} className="deed">
              <span className="dim">◇</span>
              <span>{m.name}</span>
              <span className="dim flavor">{pct > 0 ? `${pct}%` : '· · ·'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
