import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import { GE_TAX_RATE } from '@exchange-wars/engine';

export interface FlipPick {
  id: string;
  buy: number;
  sell: number;
  margin: number;
}

/**
 * Rank the most profitable round-trips available *right now*: undercut the
 * spread one tick each way (buy = bestBid+1, sell = bestAsk-1) and net the GE
 * tax — the same sum the ticket shows for one item, computed across every book.
 * Pure: tax rate is passed in so it's testable without engine coupling. Only
 * genuine two-sided spreads (a real bid AND ask, both > 0) and strictly
 * positive net margins qualify; ties break by item id for determinism.
 */
export function rankFlips(
  markets: { itemId: string; bestBid: number | null; bestAsk: number | null }[],
  taxRate: number,
  limit = 4,
): FlipPick[] {
  return markets
    .filter((m) => m.bestBid !== null && m.bestAsk !== null)
    .map((m) => {
      const buy = m.bestBid! + 1;
      const sell = m.bestAsk! - 1;
      return { id: m.itemId, buy, sell, margin: sell - buy - Math.floor(sell * taxRate) };
    })
    .filter((f) => f.buy > 0 && f.sell > 0 && f.margin > 0)
    .sort((a, b) => b.margin - a.margin || (a.id < b.id ? -1 : 1))
    .slice(0, limit);
}

/**
 * Best flips now (10v): rankFlips rendered. The actionable counterpart to the
 * Movers panel — Movers says "where's the action", this says "where's the
 * guaranteed spread profit". Click a row to load it into the ticket.
 */
export function TopFlips({
  view,
  items,
  onSelect,
  limit = 4,
}: {
  view: PlayerView;
  items: ItemDef[];
  onSelect: (id: string) => void;
  limit?: number;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const taxPct = Math.round(GE_TAX_RATE * 100);
  const flips = rankFlips(view.markets, GE_TAX_RATE, limit);
  return (
    <section className="panel topflips">
      <h2>Best Flips Now</h2>
      {flips.length === 0 ? (
        <p className="dim small">no profitable flips right now — spreads are thinner than the {taxPct}% tax</p>
      ) : (
        <ul className="rows small">
          {flips.map((f) => (
            <li
              key={f.id}
              className="mover flip"
              onClick={() => onSelect(f.id)}
              title={`buy @ ${f.buy.toLocaleString('en-US')} → sell @ ${f.sell.toLocaleString(
                'en-US',
              )}, nets ${f.margin.toLocaleString('en-US')} gp/unit after the ${taxPct}% tax`}
            >
              <span>{names.get(f.id) ?? f.id}</span>
              <span className="num dim">
                {f.buy.toLocaleString('en-US')}→{f.sell.toLocaleString('en-US')}
              </span>
              <span className="pct up">+{f.margin.toLocaleString('en-US')}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
