export function WorthChart({
  history,
  startGp,
  ghost,
}: {
  history: { tick: number; worth: number }[];
  startGp: number;
  /** Best previous run on this seed (or null) — drawn as a dim race line. */
  ghost: { tick: number; worth: number }[] | null;
}) {
  if (history.length < 2) {
    return (
      <section className="panel chart">
        <h2>Fortune</h2>
        <p className="dim small">let the world run — your net worth will chart here</p>
      </section>
    );
  }
  const W = 360;
  const H = 80;
  const g = ghost && ghost.length >= 2 ? ghost : null;
  const minT = Math.min(history[0]!.tick, g ? g[0]!.tick : Infinity);
  const maxT = Math.max(history[history.length - 1]!.tick, g ? g[g.length - 1]!.tick : -Infinity);
  const worths = history.map((p) => p.worth);
  const gWorths = g ? g.map((p) => p.worth) : [];
  const min = Math.min(...worths, ...gWorths, startGp);
  const max = Math.max(...worths, ...gWorths, startGp);
  const range = Math.max(1, max - min);
  const x = (t: number) => ((t - minT) / Math.max(1, maxT - minT)) * W;
  const y = (w: number) => H - 6 - ((w - min) / range) * (H - 12);
  const toPts = (h: { tick: number; worth: number }[]) =>
    h.map((p) => `${x(p.tick).toFixed(1)},${y(p.worth).toFixed(1)}`).join(' ');
  const last = history[history.length - 1]!.worth;
  return (
    <section className="panel chart">
      <h2>Fortune</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="worth" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1={y(startGp)} x2={W} y2={y(startGp)} className="baseline" />
        {g && (
          <polyline
            points={toPts(g)}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="3 3"
            className="ghost"
          />
        )}
        <polyline
          points={toPts(history)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={last >= startGp ? 'up' : 'down'}
        />
      </svg>
      <p className="dim small">
        low {Math.min(...worths).toLocaleString('en-US')} · high {Math.max(...worths).toLocaleString('en-US')}{' '}
        · now <b>{last.toLocaleString('en-US')}</b> · dashed = start {startGp.toLocaleString('en-US')}
        {g && <> · grey ghost = your best run on this seed</>}
      </p>
    </section>
  );
}
