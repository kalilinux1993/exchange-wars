import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import { alertHit } from '../game';

/**
 * The watchlist (9w): items the player stars, with live price + trend vs the
 * book EMA. Distinct from Market Movers (whatever's hot now) — this is YOUR
 * shortlist. Click to load in the ticket; × to unstar. Per item: a ≤ buy-below
 * alert and a ≥ sell-above (take-profit) alert. Pure display.
 */
export function WatchlistPanel({
  view,
  items,
  watch,
  alerts,
  sellAlerts,
  onSelect,
  onRemove,
  onSetAlert,
  onSetSellAlert,
}: {
  view: PlayerView;
  items: ItemDef[];
  watch: string[];
  alerts: Record<string, number>;
  sellAlerts: Record<string, number>;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onSetAlert: (id: string, price: number | null) => void;
  onSetSellAlert: (id: string, price: number | null) => void;
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
            const alert = alerts[m.itemId];
            const sellAlert = sellAlerts[m.itemId];
            const triggered =
              (alert !== undefined && alertHit(m.lastPrice, alert, 'below')) ||
              (sellAlert !== undefined && alertHit(m.lastPrice, sellAlert, 'above'));
            return (
              <li key={m.itemId} className={triggered ? 'mover alerted' : 'mover'}>
                <span onClick={() => onSelect(m.itemId)} title="load in the ticket">
                  {triggered ? '🔔 ' : ''}
                  {names.get(m.itemId) ?? m.itemId}
                </span>
                <span className="num">{m.lastPrice.toLocaleString('en-US')}</span>
                <span className={pct >= 0 ? 'pct up' : 'pct down'}>
                  {pct >= 0 ? '▲' : '▼'} {Math.abs(Math.round(pct * 100))}%
                </span>
                <label className="alertset" title="buy alert — when the price drops to this">
                  ≤
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`buy-below alert for ${names.get(m.itemId) ?? m.itemId}`}
                    value={alert ?? ''}
                    placeholder="—"
                    onChange={(e) => onSetAlert(m.itemId, e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
                <label className="alertset" title="sell alert (take-profit) — when the price climbs to this">
                  ≥
                  <input
                    type="number"
                    inputMode="numeric"
                    aria-label={`sell-above alert for ${names.get(m.itemId) ?? m.itemId}`}
                    value={sellAlert ?? ''}
                    placeholder="—"
                    onChange={(e) => onSetSellAlert(m.itemId, e.target.value === '' ? null : Number(e.target.value))}
                  />
                </label>
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
