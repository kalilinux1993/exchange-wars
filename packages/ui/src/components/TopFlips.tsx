import type { ItemDef, PlayerView } from '@exchange-wars/engine';
import { GE_TAX_RATE } from '@exchange-wars/engine';

export interface FlipPick {
  id: string;
  buy: number;
  sell: number;
  margin: number;
  /** Net margin as a fraction of buy cost — efficiency, not just absolute gp. */
  roi: number;
  /** GE buy allowance left this window (null = unlimited); how big the flip can go. */
  limit: number | null;
}

/**
 * Rank the most profitable round-trips available *right now*: undercut the
 * spread one tick each way (buy = bestBid+1, sell = bestAsk-1) and net the GE
 * tax — the same sum the ticket shows for one item, computed across every book.
 * Pure: tax rate is passed in so it's testable without engine coupling. Only
 * genuine two-sided spreads (a real bid AND ask, both > 0) and strictly
 * positive net margins qualify; ranked by absolute margin (ties by item id).
 * Each pick also carries return-on-cost and the buy limit as honest decision
 * info — both well-defined from data, no order-flow guesswork in the ranking.
 */
export function rankFlips(
  markets: { itemId: string; bestBid: number | null; bestAsk: number | null; buyRemaining?: number | null }[],
  taxRate: number,
  limit = 4,
): FlipPick[] {
  return markets
    .filter((m) => m.bestBid !== null && m.bestAsk !== null)
    .map((m) => {
      const buy = m.bestBid! + 1;
      const sell = m.bestAsk! - 1;
      const margin = sell - buy - Math.floor(sell * taxRate);
      return { id: m.itemId, buy, sell, margin, roi: buy > 0 ? margin / buy : 0, limit: m.buyRemaining ?? null };
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
  /** Load this flip: select the item AND prefill the buy leg at `buyPrice`. */
  onSelect: (id: string, buyPrice: number) => void;
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
              onClick={() => onSelect(f.id, f.buy)}
              title={`click to load a buy @ ${f.buy.toLocaleString('en-US')} → then sell @ ${f.sell.toLocaleString(
                'en-US',
              )}, nets ${f.margin.toLocaleString('en-US')} gp/unit (${(f.roi * 100).toFixed(1)}% of cost) after the ${taxPct}% tax${
                f.limit !== null ? ` · GE limit ${f.limit.toLocaleString('en-US')} this window` : ''
              }`}
            >
              <span>{names.get(f.id) ?? f.id}</span>
              <span className="num dim">
                {f.buy.toLocaleString('en-US')}→{f.sell.toLocaleString('en-US')}
                {f.limit !== null && <span className="flimit"> ≤{f.limit.toLocaleString('en-US')}</span>}
              </span>
              <span className="pct up">
                +{f.margin.toLocaleString('en-US')} <span className="froi">{(f.roi * 100).toFixed(f.roi < 0.1 ? 1 : 0)}%</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
