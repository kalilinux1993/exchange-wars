import type { ItemDef, ItemId, PlayerView } from '@exchange-wars/engine';

export function MarketTable({
  view,
  items,
  selected,
  onSelect,
}: {
  view: PlayerView;
  items: ItemDef[];
  selected: ItemId;
  onSelect: (id: ItemId) => void;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
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
            <th className="num">ema</th>
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
                {names.get(m.itemId) ?? m.itemId}
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
              <td className="num dim">{Math.round(m.ema).toLocaleString('en-US')}</td>
              <td className="num dim">{m.volume.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="dim small">click a row to load it into the offer ticket</p>
    </section>
  );
}
