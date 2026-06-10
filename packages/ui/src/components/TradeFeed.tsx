import type { ItemDef, Trade } from '@exchange-wars/engine';

export function TradeFeed({
  trades,
  items,
  playerId,
}: {
  trades: Trade[];
  items: ItemDef[];
  playerId: number;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const recent = trades.slice(-12).reverse();
  return (
    <section className="panel feed">
      <h2>Tape</h2>
      <ul className="rows small">
        {recent.map((t, i) => {
          const mine = t.buyerId === playerId || t.sellerId === playerId;
          return (
            <li key={`${t.tick}-${i}`} className={mine ? 'mine-row' : ''}>
              <span className="dim num">t{t.tick.toLocaleString('en-US')}</span>
              <span>{names.get(t.itemId) ?? t.itemId}</span>
              <span className="num">
                {t.qty} @ {t.price.toLocaleString('en-US')}
              </span>
              {mine && <span className="mine">◆</span>}
            </li>
          );
        })}
        {recent.length === 0 && <li className="dim">no trades yet — press play</li>}
      </ul>
    </section>
  );
}
