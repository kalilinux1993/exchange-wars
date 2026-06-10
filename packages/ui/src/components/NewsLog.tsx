import type { NewsEntry } from '../game';

export function NewsLog({ log }: { log: NewsEntry[] }) {
  return (
    <section className="panel chronicle">
      <h2>Chronicle</h2>
      <ul className="rows small">
        {[...log].reverse().map((n, i) => (
          <li key={`${n.tick}-${i}`} className={n.kind === 'ended' ? 'dim' : ''}>
            <span className="dim num">t{n.tick.toLocaleString('en-US')}</span>
            <span>⚡ {n.text}</span>
            {n.move !== undefined && (
              <span className={`num ${n.move >= 0 ? 'up' : 'down'}`}>{`${n.move >= 0 ? '+' : ''}${n.move}%`}</span>
            )}
          </li>
        ))}
        {log.length === 0 && <li className="dim">quiet markets — so far</li>}
      </ul>
    </section>
  );
}
