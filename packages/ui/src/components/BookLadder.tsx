import type { Order, OrderBook } from '@exchange-wars/engine';

interface Level {
  price: number;
  qty: number;
  mine: boolean;
}

function levels(orders: Order[], n: number, playerId: number): Level[] {
  const out: Level[] = [];
  for (const o of orders) {
    const last = out[out.length - 1];
    if (last && last.price === o.price) {
      last.qty += o.remaining;
      last.mine = last.mine || o.agentId === playerId;
    } else {
      if (out.length >= n) break;
      out.push({ price: o.price, qty: o.remaining, mine: o.agentId === playerId });
    }
  }
  return out;
}

/** Live order-book depth for the selected item (display-only world read). */
export function BookLadder({ book, playerId }: { book: OrderBook | undefined; playerId: number }) {
  if (!book) return null;
  const asks = levels(book.sells, 5, playerId).reverse(); // best ask nearest the spread
  const bids = levels(book.buys, 5, playerId);
  const bestAsk = book.sells[0]?.price ?? null;
  const bestBid = book.buys[0]?.price ?? null;
  const spread = bestAsk !== null && bestBid !== null ? bestAsk - bestBid : null;
  const maxQty = Math.max(1, ...asks.map((l) => l.qty), ...bids.map((l) => l.qty));
  const row = (l: Level, side: 'bid' | 'ask') => (
    <li key={`${side}-${l.price}`} className={`level ${side}`}>
      <span className="bar" style={{ width: `${Math.round((l.qty / maxQty) * 100)}%` }} />
      <span className="num price">{l.price.toLocaleString('en-US')}</span>
      <span className="num qty">{l.qty.toLocaleString('en-US')}</span>
      <span className="mine">{l.mine ? '◆' : ''}</span>
    </li>
  );
  return (
    <section className="panel ladder">
      <h2>Depth · {book.itemId.replace(/_/g, ' ')}</h2>
      <ul className="levels">
        {asks.map((l) => row(l, 'ask'))}
        <li className="level spread-row">
          <span className="dim small">
            spread {spread !== null ? spread.toLocaleString('en-US') : '—'}
          </span>
        </li>
        {bids.map((l) => row(l, 'bid'))}
        {asks.length === 0 && bids.length === 0 && <li className="dim small">empty book — press play</li>}
      </ul>
    </section>
  );
}
