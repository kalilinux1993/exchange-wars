import type { PlayerView } from '@exchange-wars/engine';
import { MILESTONES, type Game } from '../game';

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
  return (
    <section className="panel milestones">
      <h2>
        Deeds <span className="dim">{got}/{MILESTONES.length}</span>
      </h2>
      <ul className="rows small">
        {MILESTONES.map((m) => {
          const done = unlocked.includes(m.id);
          const pct = !done && m.progress ? Math.min(99, Math.floor(m.progress(game, view, worth) * 100)) : null;
          return (
            <li key={m.id} className={done ? 'deed got' : 'deed'}>
              <span className={done ? 'mine' : 'dim'}>{done ? '◆' : '◇'}</span>
              <span>{m.name}</span>
              <span className="dim flavor">{done ? m.flavor : pct !== null ? `${pct}%` : '· · ·'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
