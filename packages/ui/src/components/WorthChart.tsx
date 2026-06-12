import { fmtCompact, fmtDuration, nextRoundTarget, worthRate } from '../game';

/** Ghost worth at a tick: linear interpolation; clamps to the endpoints. */
export function ghostWorthAt(history: { tick: number; worth: number }[], tick: number): number {
  if (history.length === 0) return 0;
  if (tick <= history[0]!.tick) return history[0]!.worth;
  const last = history[history.length - 1]!;
  if (tick >= last.tick) return last.worth;
  for (let i = 1; i < history.length; i++) {
    const b = history[i]!;
    if (b.tick >= tick) {
      const a = history[i - 1]!;
      const f = (tick - a.tick) / Math.max(1, b.tick - a.tick);
      return Math.round(a.worth + f * (b.worth - a.worth));
    }
  }
  return last.worth;
}

export function WorthChart({
  history,
  startGp,
  ghost,
  milestones = [],
}: {
  history: { tick: number; worth: number }[];
  startGp: number;
  /** Best previous run on this seed (or null) — drawn as a dim race line. */
  ghost: { tick: number; worth: number }[] | null;
  /** Earned deeds with their achievement tick — marked on the curve (11t). */
  milestones?: { tick: number; name: string }[];
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
  // Projection: at the recent gp/min rate, when do you cross the next round number?
  const rate = worthRate(history);
  const target = nextRoundTarget(last);
  const etaMin = rate && rate.perMin > 0 ? (target - last) / rate.perMin : null;
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
        {milestones
          .filter((ms) => ms.tick >= minT && ms.tick <= maxT)
          .map((ms, i) => (
            <circle key={i} cx={x(ms.tick)} cy={y(ghostWorthAt(history, ms.tick))} r={2.4} className="deedmark">
              <title>🏅 {ms.name}</title>
            </circle>
          ))}
      </svg>
      <p className="dim small">
        low {Math.min(...worths).toLocaleString('en-US')} · high {Math.max(...worths).toLocaleString('en-US')}{' '}
        · now <b>{last.toLocaleString('en-US')}</b> · dashed = start {startGp.toLocaleString('en-US')}
        {g &&
          (() => {
            const delta = last - ghostWorthAt(g, history[history.length - 1]!.tick);
            return (
              <>
                {' '}
                · vs ghost{' '}
                <b
                  className={delta >= 0 ? 'up' : 'down'}
                  title="the grey dashes are your best previous run on this seed"
                >
                  {delta >= 0 ? '+' : ''}
                  {delta.toLocaleString('en-US')}
                </b>
              </>
            );
          })()}
        {etaMin !== null && (
          <span className="eta" title="at your recent gp/min rate, when you'd reach the next round number">
            {' '}· ≈{fmtDuration(Math.round(etaMin * 60))} to {fmtCompact(target)}
          </span>
        )}
      </p>
    </section>
  );
}
