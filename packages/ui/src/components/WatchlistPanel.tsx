import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import { alertHit, bandPosition, flipMargin, valueBand } from '../game';

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
  bandAlerts,
  onSelect,
  onRemove,
  onSetAlert,
  onSetSellAlert,
  onToggleBandAlert,
}: {
  view: PlayerView;
  items: ItemDef[];
  watch: string[];
  alerts: Record<string, number>;
  sellAlerts: Record<string, number>;
  /** Items armed for a value-band "buy the dip" alert (fires when they go cheap). */
  bandAlerts: Record<string, boolean>;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onSetAlert: (id: string, price: number | null) => void;
  onSetSellAlert: (id: string, price: number | null) => void;
  onToggleBandAlert: (id: string, on: boolean) => void;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const defOf = new Map(items.map((i) => [i.id, i]));
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
                {(() => {
                  const mg = flipMargin(m);
                  const band = valueBand(defOf.get(m.itemId), m.lastPrice);
                  if (mg === null && band === null) return null;
                  return (
                    <span className="dim small watchsignal" title="after-tax flip margin at the current spread · where it sits in its cost→value band (🟢 cheap / ⚪ fair / 🟡 rich)">
                      {mg !== null && (
                        <b className={mg > 0 ? 'pct up' : 'dim'}>
                          flip {mg > 0 ? '+' : ''}
                          {mg}
                        </b>
                      )}
                      {band && ` ${band === 'cheap' ? '🟢' : band === 'rich' ? '🟡' : '⚪'}`}
                    </span>
                  );
                })()}
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
                {bandPosition(defOf.get(m.itemId), m.lastPrice) !== null &&
                  (() => {
                    const armed = bandAlerts[m.itemId] === true;
                    return (
                      <button
                        className={armed ? 'chip bandalert on' : 'chip bandalert'}
                        aria-pressed={armed}
                        title={
                          armed
                            ? 'cheap-band alert ON — tap to disarm; fires when this enters its cheap band'
                            : 'alert me when this drops into its cheap band (a self-adjusting "buy the dip" — no price to set)'
                        }
                        onClick={() => onToggleBandAlert(m.itemId, !armed)}
                      >
                        🟢{armed ? '✓' : ''}
                      </button>
                    );
                  })()}
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
