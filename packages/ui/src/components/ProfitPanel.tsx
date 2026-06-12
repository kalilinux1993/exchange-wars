import type { ItemDef } from '@exchange-wars/engine';
import type { Game } from '../game';
import { fmtCompact, realizedFromBook } from '../game';

/**
 * Profit by item (11b; lifetime in 11o): which items your flips actually made
 * (or lost) money on — realized round-trips from the lifetime trade book,
 * FIFO-matched and tax-netted. The reflective counterpart to TopFlips' "what to
 * do next": this is "what worked". Click a row to load it into the ticket.
 */
export function ProfitPanel({
  game,
  items,
  onSelect,
  limit = 6,
}: {
  game: Game;
  items: ItemDef[];
  onSelect: (id: string) => void;
  limit?: number;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const pnl = realizedFromBook(game.tradeBook).slice(0, limit);
  return (
    <section className="panel profit">
      <h2>Profit by Item</h2>
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
