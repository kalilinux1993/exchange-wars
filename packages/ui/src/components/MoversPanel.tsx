import type { ItemDef, PlayerView } from '@exchange-wars/engine';

/**
 * Market movers (9t): the items furthest above and below their own trend
 * (lastPrice vs the slow EMA) right now — a flipper's "where's the action"
 * glance: buy the cold, sell the hot. Pure derived display; click a row to
 * load it into the ticket. Only traded items (volume > 0) qualify.
 */
export function MoversPanel({
  view,
  items,
  onSelect,
}: {
  view: PlayerView;
  items: ItemDef[];
  onSelect: (id: string) => void;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const scored = view.markets
    .filter((m) => m.volume > 0 && m.ema > 0)
    .map((m) => ({ id: m.itemId, last: m.lastPrice, pct: (m.lastPrice - m.ema) / m.ema }))
    .sort((a, b) => b.pct - a.pct);
  const hot = scored.filter((s) => s.pct > 0).slice(0, 3);
  const cold = scored
    .filter((s) => s.pct < 0)
    .slice(-3)
    .reverse();
  const row = (s: { id: string; last: number; pct: number }, kind: 'hot' | 'cold') => (
    <li key={s.id} className="mover" onClick={() => onSelect(s.id)} title="load in the ticket">
      <span>{names.get(s.id) ?? s.id}</span>
      <span className="num">{s.last.toLocaleString('en-US')}</span>
      <span className={kind === 'hot' ? 'pct up' : 'pct down'}>
        {s.pct >= 0 ? '▲' : '▼'} {Math.abs(Math.round(s.pct * 100))}%
      </span>
    </li>
  );
  return (
    <section className="panel movers">
      <h2>Market Movers</h2>
      {scored.length === 0 ? (
        <p className="dim small">let the market trade a while — movers appear once prices wander from trend</p>
      ) : (
        <>
          <h3 className="dim small">🔥 hot — above trend</h3>
          <ul className="rows small">{hot.length ? hot.map((s) => row(s, 'hot')) : <li className="dim">none</li>}</ul>
          <h3 className="dim small">❄ cold — below trend</h3>
          <ul className="rows small">{cold.length ? cold.map((s) => row(s, 'cold')) : <li className="dim">none</li>}</ul>
        </>
      )}
    </section>
  );
}
