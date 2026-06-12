import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import type { Game } from '../game';
import { fmtCompact, heldPositions } from '../game';

/**
 * Open Positions (12c): every item you currently HOLD, marked at last price —
 * avg cost → now → paper P&L %. The ticket only ever showed cost basis for the
 * one selected item; this is the whole satchel at a glance, so "which position
 * is underwater / ripe to take profit" is one look, not N clicks. The unrealized
 * sibling of ProfitPanel's realized rows. Click a row to load it in the ticket.
 */
export function PositionsPanel({
  game,
  view,
  items,
  onSelect,
  limit = 8,
}: {
  game: Game;
  view: PlayerView;
  items: ItemDef[];
  onSelect: (id: string) => void;
  limit?: number;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const priceOf = new Map(view.markets.map((m) => [m.itemId, m.lastPrice]));
  const positions = heldPositions(game.tradeBook, (id) => priceOf.get(id) ?? 0);
  const shown = positions.slice(0, limit);
  const totalValue = positions.reduce((s, p) => s + p.value, 0);
  const totalPaper = positions.reduce((s, p) => s + p.unrealized, 0);
  const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
  return (
    <section className="panel positions">
      <h2>
        Open Positions{' '}
        {positions.length > 0 && (
          <span className="dim small" title="value = held units marked at last price; paper = unrealized P&L vs your average cost">
            {' '}
            value {fmtCompact(totalValue)} · paper{' '}
            <b className={totalPaper >= 0 ? 'pct up' : 'pct down'}>
              {totalPaper >= 0 ? '+' : ''}
              {fmtCompact(totalPaper)}
            </b>
          </span>
        )}
      </h2>
      {positions.length === 0 ? (
        <p className="dim small">no open positions — buy an item to open one (its cost basis shows up here)</p>
      ) : (
        <ul className="rows small">
          {shown.map((p) => (
            <li
              key={p.itemId}
              className="mover"
              onClick={() => onSelect(p.itemId)}
              title={`${p.units.toLocaleString('en-US')} held · avg ${p.avgCost.toLocaleString('en-US')} → ${
                p.marked ? p.mark.toLocaleString('en-US') : 'no live price'
              } — load in the ticket`}
            >
              <span>{names.get(p.itemId) ?? p.itemId}</span>
              <span className="dim small">×{p.units.toLocaleString('en-US')}</span>
              <span className="dim small">
                {fmtCompact(p.avgCost)}→{p.marked ? fmtCompact(p.mark) : '·'}
              </span>
              <span className={p.unrealized >= 0 ? 'pct up' : 'pct down'}>
                {p.unrealized >= 0 ? '+' : ''}
                {fmtCompact(p.unrealized)}
                {p.marked && p.cost > 0 && <span className="dim small"> {pct(p.unrealizedPct)}</span>}
              </span>
            </li>
          ))}
          {positions.length > shown.length && (
            <li className="dim small">+{positions.length - shown.length} more held…</li>
          )}
        </ul>
      )}
    </section>
  );
}
