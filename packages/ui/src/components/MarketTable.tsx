import type { ItemDef, ItemId, PlayerView, Trade } from '@exchange-wars/engine';

const SPARK_POINTS = 20;

/** Tiny price history from the engine's recent-trades window (display-only read). */
function Spark({ prices }: { prices: number[] }) {
  if (prices.length < 2) return <span className="dim">·</span>;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(1, max - min);
  const pts = prices
    .map((p, i) => `${((i / (prices.length - 1)) * 40).toFixed(1)},${(11 - ((p - min) / range) * 10).toFixed(1)}`)
    .join(' ');
  const up = prices[prices.length - 1]! >= prices[0]!;
  return (
    <svg className={`spark ${up ? 'up' : 'down'}`} width="40" height="12" viewBox="0 0 40 12" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function MarketTable({
  view,
  items,
  trades,
  selected,
  onSelect,
}: {
  view: PlayerView;
  items: ItemDef[];
  trades: Trade[];
  selected: ItemId;
  onSelect: (id: ItemId) => void;
}) {
  const defs = new Map(items.map((i) => [i.id, i]));
  const sparks = new Map<ItemId, number[]>();
  for (const t of trades) {
    const arr = sparks.get(t.itemId) ?? [];
    arr.push(t.price);
    sparks.set(t.itemId, arr);
  }
  return (
    <section className="panel market">
      <h2>Grand Exchange</h2>
      <table>
        <thead>
          <tr>
            <th>item</th>
            <th className="num">bid</th>
            <th className="num">ask</th>
            <th className="num">last</th>
            <th aria-label="trend" />
            <th className="num">volume</th>
          </tr>
        </thead>
        <tbody>
          {view.markets.map((m) => (
            <tr
              key={m.itemId}
              className={m.itemId === selected ? 'selected' : ''}
              onClick={() => onSelect(m.itemId)}
            >
              <td className="name">
                {defs.get(m.itemId)?.wikiId !== undefined && (
                  <img
                    className="icon"
                    src={`${import.meta.env.BASE_URL}icons/${defs.get(m.itemId)!.wikiId}.png`}
                    alt=""
                  />
                )}
                {defs.get(m.itemId)?.name ?? m.itemId}
                {(m.bestBidIsMine || m.bestAskIsMine) && (
                  <span className="mine" title="your offer is best">
                    {' '}
                    ◆
                  </span>
                )}
              </td>
              <td className="num bid">{m.bestBid?.toLocaleString('en-US') ?? '—'}</td>
              <td className="num ask">{m.bestAsk?.toLocaleString('en-US') ?? '—'}</td>
              <td className={`num ${m.lastPrice >= m.ema ? 'up' : 'down'}`}>
                {m.lastPrice.toLocaleString('en-US')}
              </td>
              <td className="sparkcell">
                <Spark prices={(sparks.get(m.itemId) ?? []).slice(-SPARK_POINTS)} />
              </td>
              <td className="num dim">{m.volume.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dim small">click a row to load it into the offer ticket</p>
    </section>
  );
}
