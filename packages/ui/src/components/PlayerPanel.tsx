import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';

export function PlayerPanel({
  view,
  items,
  onCommand,
}: {
  view: PlayerView;
  items: ItemDef[];
  onCommand: (cmd: PlayerCommand) => void;
}) {
  const held = items.filter((i) => (view.inventory[i.id] ?? 0) > 0);
  return (
    <section className="panel player">
      <h2>Ledger</h2>
      <h3>Inventory</h3>
      <ul className="rows">
        {held.map((i) => {
          const qty = view.inventory[i.id] ?? 0;
          const last = view.markets.find((m) => m.itemId === i.id)?.lastPrice ?? 0;
          return (
            <li key={i.id}>
              <span>{i.name}</span>
              <span className="num">
                {qty.toLocaleString('en-US')} · ≈{(qty * last).toLocaleString('en-US')} gp
              </span>
            </li>
          );
        })}
        {held.length === 0 && <li className="dim">empty satchel</li>}
      </ul>
      <h3>Open offers</h3>
      <ul className="rows">
        {view.openOrders.map((o) => (
          <li key={o.id}>
            <span className={`badge ${o.side}`}>{o.side}</span>
            <span>{o.itemId.replace(/_/g, ' ')}</span>
            <span className="num">
              {o.remaining} @ {o.price.toLocaleString('en-US')}
            </span>
            <button className="chip danger" onClick={() => onCommand({ type: 'cancel', itemId: o.itemId, side: o.side })}>
              abort
            </button>
          </li>
        ))}
        {view.openOrders.length === 0 && <li className="dim">no open offers</li>}
      </ul>
    </section>
  );
}
