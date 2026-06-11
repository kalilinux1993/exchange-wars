import type { ItemDef, PlayerView } from '@exchange-wars/engine';

/**
 * The watchlist (9w): items the player stars, with live price + trend vs the
 * book EMA. Distinct from Market Movers (whatever's hot now) — this is YOUR
 * shortlist. Click to load in the ticket; × to unstar. Pure display.
 */
export function WatchlistPanel({
  view,
  items,
  watch,
  onSelect,
  onRemove,
}: {
  view: PlayerView;
  items: ItemDef[];
  watch: string[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const rows = watch.map((id) => view.markets.find((m) => m.itemId === id)).filter((m): m is NonNullable<typeof m> => !!m);
  return (
    <section className="panel watchlist">
      <h2>Watchlist</h2>
      {rows.length === 0 ? (
        <p className="dim small">star an item from the ticket to track it here</p>
      ) : (
        <ul className="rows small">
          {rows.map((m) => {
            const pct = m.ema > 0 ? (m.lastPrice - m.ema) / m.ema : 0;
            return (
              <li key={m.itemId} className="mover">
                <span onClick={() => onSelect(m.itemId)} title="load in the ticket">
                  {names.get(m.itemId) ?? m.itemId}
                </span>
                <span className="num">{m.lastPrice.toLocaleString('en-US')}</span>
                <span className={pct >= 0 ? 'pct up' : 'pct down'}>
                  {pct >= 0 ? '▲' : '▼'} {Math.abs(Math.round(pct * 100))}%
                </span>
                <button className="chip" title="unstar" onClick={() => onRemove(m.itemId)}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
