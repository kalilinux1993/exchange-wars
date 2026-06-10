export function WorthChart({
  history,
  startGp,
}: {
  history: { tick: number; worth: number }[];
  startGp: number;
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
  const minT = history[0]!.tick;
  const maxT = history[history.length - 1]!.tick;
  const worths = history.map((p) => p.worth);
  const min = Math.min(...worths, startGp);
  const max = Math.max(...worths, startGp);
  const range = Math.max(1, max - min);
  const x = (t: number) => ((t - minT) / Math.max(1, maxT - minT)) * W;
  const y = (w: number) => H - 6 - ((w - min) / range) * (H - 12);
  const pts = history.map((p) => `${x(p.tick).toFixed(1)},${y(p.worth).toFixed(1)}`).join(' ');
  const last = history[history.length - 1]!.worth;
  return (
    <section className="panel chart">
      <h2>Fortune</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="worth" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1={y(startGp)} x2={W} y2={y(startGp)} className="baseline" />
        <polyline
          points={pts}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={last >= startGp ? 'up' : 'down'}
        />
      </svg>
      <p className="dim small">
        low {Math.min(...worths).toLocaleString('en-US')} · high {Math.max(...worths).toLocaleString('en-US')}{' '}
        · now <b>{last.toLocaleString('en-US')}</b> · dashed = start {startGp.toLocaleString('en-US')}
      </p>
    </section>
  );
}
