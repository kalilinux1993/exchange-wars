import { MILESTONES } from '../game';

export function MilestonesPanel({ unlocked }: { unlocked: string[] }) {
  const got = unlocked.length;
  return (
    <section className="panel milestones">
      <h2>
        Deeds <span className="dim">{got}/{MILESTONES.length}</span>
      </h2>
      <ul className="rows small">
        {MILESTONES.map((m) => {
          const done = unlocked.includes(m.id);
          return (
            <li key={m.id} className={done ? 'deed got' : 'deed'}>
              <span className={done ? 'mine' : 'dim'}>{done ? '◆' : '◇'}</span>
              <span>{m.name}</span>
              <span className="dim flavor">{done ? m.flavor : '· · ·'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
