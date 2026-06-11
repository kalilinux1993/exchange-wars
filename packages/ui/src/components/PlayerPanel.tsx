import { GEAR } from '@exchange-wars/engine';
import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { bidWalk, type Game } from '../game';

export function PlayerPanel({
  game,
  view,
  items,
  onCommand,
}: {
  game: Game;
  view: PlayerView;
  items: ItemDef[];
  onCommand: (cmd: PlayerCommand) => void;
}) {
  const held = items.filter((i) => (view.inventory[i.id] ?? 0) > 0);
  // Selling at the walk's floor fills the whole walkable qty instantly —
  // realize exactly what the honest mark says the bids would pay (8w).
  const sellable = held
    .map((i) => ({ item: i, walk: bidWalk(game, i.id, view.inventory[i.id] ?? 0) }))
    .filter((s) => s.walk !== null);
  const dump = (itemId: string): void => {
    const walk = bidWalk(game, itemId, view.inventory[itemId] ?? 0);
    if (walk) onCommand({ type: 'place', itemId, side: 'sell', price: walk.floor, qty: walk.qty });
  };
  return (
    <section className="panel player">
      <h2>Ledger</h2>
      <h3>Inventory</h3>
      {held.some((i) => GEAR[i.id] !== undefined) && (
        <p className="dim small">⚔ to wear gear, take it on an expedition — the <b>⚔ Adventure</b> tab's pack auto-equips your best.</p>
      )}
      <ul className="rows">
        {held.map((i) => {
          const qty = view.inventory[i.id] ?? 0;
          const walk = bidWalk(game, i.id, qty);
          return (
            <li key={i.id}>
              <span>{i.name}</span>
              <span className="num">
                {qty.toLocaleString('en-US')} · bids pay ≈{(walk?.gp ?? 0).toLocaleString('en-US')} gp
              </span>
              {walk && (
                <button className="chip" title={`sell ${walk.qty} into the resting bids (fills instantly)`} onClick={() => dump(i.id)}>
                  sell @ bid
                </button>
              )}
            </li>
          );
        })}
        {held.length === 0 && <li className="dim">empty satchel</li>}
        {held.length > 0 && (
          <li>
            <span className="dim">satchel, as the bids see it</span>
            <span className="num">
              ≈
              {held
                .reduce((total, i) => total + (bidWalk(game, i.id, view.inventory[i.id] ?? 0)?.gp ?? 0), 0)
                .toLocaleString('en-US')}{' '}
              gp
            </span>
            {sellable.length > 1 && (
              <button
                className="chip"
                title="sell every stack into the resting bids — one fill-only order per item"
                onClick={() => {
                  for (const s of sellable) dump(s.item.id);
                }}
              >
                sell the spoils
              </button>
            )}
          </li>
        )}
      </ul>
      <h3>
        Open offers
        {view.openOrders.length > 1 && (
          <button
            className="chip danger"
            title="cancel every resting offer (escrow is refunded)"
            onClick={() => onCommand({ type: 'cancel' })}
          >
            abort all
          </button>
        )}
      </h3>
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
