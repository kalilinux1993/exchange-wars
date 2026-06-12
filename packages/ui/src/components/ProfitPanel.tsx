import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import type { Game } from '../game';
import { fmtCompact, realizedFromBook, totalRealized, totalUnrealized, tradeRecord } from '../game';

/**
 * Profit by item (11b; lifetime in 11o): which items your flips actually made
 * (or lost) money on — realized round-trips from the lifetime trade book,
 * FIFO-matched and tax-netted. The reflective counterpart to TopFlips' "what to
 * do next": this is "what worked". Header carries the scorecard — realized
 * (locked in) + unrealized (paper, marked at last price). Click a row to load it.
 */
export function ProfitPanel({
  game,
  view,
  items,
  onSelect,
  limit = 6,
}: {
  game: Game;
  view: PlayerView;
  items: ItemDef[];
  onSelect: (id: string) => void;
  limit?: number;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const pnl = realizedFromBook(game.tradeBook).slice(0, limit);
  const realized = totalRealized(game.tradeBook);
  const priceOf = new Map(view.markets.map((m) => [m.itemId, m.lastPrice]));
  const unrealized = totalUnrealized(game.tradeBook, (id) => priceOf.get(id) ?? 0);
  const tag = (n: number) => (
    <b className={n >= 0 ? 'pct up' : 'pct down'}>
      {n >= 0 ? '+' : ''}
      {fmtCompact(n)}
    </b>
  );
  return (
    <section className="panel profit">
      <h2>
        Profit by Item{' '}
        {(realized !== 0 || unrealized !== 0) && (
          <span className="dim small" title="realized = locked in from completed flips; unrealized = paper P&L on what you still hold, marked at last price">
            {' '}
            realized {tag(realized)} · paper {tag(unrealized)}
          </span>
        )}
      </h2>
      {(() => {
        const rec = tradeRecord(game.tradeBook);
        const scored = rec.winners + rec.losers;
        if (scored === 0) return null;
        return (
          <p
            className="dim small"
            title="how consistent your flips are — items closed in profit vs at a loss, and your single worst item (the one the top list hides)"
          >
            profitable on <b className="pct up">{rec.winners}</b> of {scored} item{scored === 1 ? '' : 's'}
            {rec.worst && rec.worst.profit < 0 && (
              <span>
                {' · worst '}
                <b className="pct down">
                  {names.get(rec.worst.itemId) ?? rec.worst.itemId} {fmtCompact(rec.worst.profit)}
                </b>
              </span>
            )}
          </p>
        );
      })()}
      {pnl.length === 0 ? (
        <p className="dim small">no completed flips yet — buy an item then sell it to see your realized profit</p>
      ) : (
        <ul className="rows small">
          {pnl.map((p) => (
            <li
              key={p.itemId}
              className="mover"
              onClick={() => onSelect(p.itemId)}
              title={`${p.soldUnits.toLocaleString('en-US')} unit${p.soldUnits === 1 ? '' : 's'} sold, net ${p.profit.toLocaleString('en-US')} gp after tax — load in the ticket`}
            >
              <span>{names.get(p.itemId) ?? p.itemId}</span>
              <span className="dim small">×{p.soldUnits.toLocaleString('en-US')}</span>
              <span className={p.profit >= 0 ? 'pct up' : 'pct down'}>
                {p.profit >= 0 ? '+' : ''}
                {fmtCompact(p.profit)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
