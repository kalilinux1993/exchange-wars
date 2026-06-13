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
  richAlerts,
  flipAlerts = {},
  onSelect,
  onRemove,
  onSetAlert,
  onSetSellAlert,
  onToggleBandAlert,
  onToggleRichAlert,
  onToggleFlipAlert,
}: {
  view: PlayerView;
  items: ItemDef[];
  watch: string[];
  alerts: Record<string, number>;
  sellAlerts: Record<string, number>;
  /** Items armed for a value-band "buy the dip" alert (fires when they go cheap). */
  bandAlerts: Record<string, boolean>;
  /** Items armed for a value-band "take profit" alert (fires when they go rich). */
  richAlerts: Record<string, boolean>;
  /** Items armed for a flippable-spread alert (fires when the live spread is profitably flippable). Optional
   *  so isolated renders without the handler simply omit the toggle. */
  flipAlerts?: Record<string, boolean>;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onSetAlert: (id: string, price: number | null) => void;
  onSetSellAlert: (id: string, price: number | null) => void;
  onToggleBandAlert: (id: string, on: boolean) => void;
  onToggleRichAlert: (id: string, on: boolean) => void;
  onToggleFlipAlert?: (id: string, on: boolean) => void;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const defOf = new Map(items.map((i) => [i.id, i]));
  const rows = watch.map((id) => view.markets.find((m) => m.itemId === id)).filter((m): m is NonNullable<typeof m> => !!m);
  // Has this item's buy (≤) or sell (≥) alert fired at the current price? Drives both the row state and the
  // sort below — a fired alert is only useful if you SEE it (18l).
  const isTriggered = (m: (typeof rows)[number]): boolean => {
    const alert = alerts[m.itemId];
    const sellAlert = sellAlerts[m.itemId];
    return (
      (alert !== undefined && alertHit(m.lastPrice, alert, 'below')) ||
      (sellAlert !== undefined && alertHit(m.lastPrice, sellAlert, 'above'))
    );
  };
  // Float triggered rows to the top so a fired alert is unmissable in a long list. Stable sort (ES2019):
  // a row moves ONLY when its alert crosses (fires) or un-crosses (clears) — meaningful motion, not tick jitter.
  const sorted = [...rows].sort((a, b) => Number(isTriggered(b)) - Number(isTriggered(a)));
  return (
    <section className="panel watchlist">
      <h2>Watchlist</h2>
      {rows.length === 0 ? (
        <p className="dim small">star an item to track it here — the ★ on a market row, the ticket star, or press w on the loaded item</p>
      ) : (
        <ul className="rows small">
          {sorted.map((m) => {
            const pct = m.ema > 0 ? (m.lastPrice - m.ema) / m.ema : 0;
            const alert = alerts[m.itemId];
            const sellAlert = sellAlerts[m.itemId];
            const triggered = isTriggered(m);
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
                {bandPosition(defOf.get(m.itemId), m.lastPrice) !== null &&
                  (() => {
                    const armed = richAlerts[m.itemId] === true;
                    return (
                      <button
                        className={armed ? 'chip richalert on' : 'chip richalert'}
                        aria-pressed={armed}
                        title={
                          armed
                            ? 'rich-band alert ON — tap to disarm; fires when this enters its rich band'
                            : 'alert me when this climbs into its rich band (a self-adjusting "take profit" — no price to set)'
                        }
                        onClick={() => onToggleRichAlert(m.itemId, !armed)}
                      >
                        🟡{armed ? '✓' : ''}
                      </button>
                    );
                  })()}
                {onToggleFlipAlert &&
                  flipMargin(m) !== null &&
                  (() => {
                    const armed = flipAlerts[m.itemId] === true;
                    return (
                      <button
                        className={armed ? 'chip flipalert on' : 'chip flipalert'}
                        aria-pressed={armed}
                        title={
                          armed
                            ? 'flippable-spread alert ON — tap to disarm; fires when the spread is profitably flippable now'
                            : 'alert me when this is profitably flippable now (the live spread clears a solid after-tax margin — no price to set)'
                        }
                        onClick={() => onToggleFlipAlert(m.itemId, !armed)}
                      >
                        🔁{armed ? '✓' : ''}
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
