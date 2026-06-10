import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';

export function ContractsBoard({
  view,
  items,
  tick,
  onCommand,
}: {
  view: PlayerView;
  items: ItemDef[];
  tick: number;
  onCommand: (cmd: PlayerCommand) => void;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  return (
    <section className="panel contracts">
      <h2>Quartermaster's Board</h2>
      <ul className="rows small">
        {view.contracts.map((c) => {
          const have = view.inventory[c.itemId] ?? 0;
          const ready = have >= c.qty;
          return (
            <li key={c.id}>
              <span>
                {c.qty}× {names.get(c.itemId) ?? c.itemId}
              </span>
              <span className="num">
                @ {c.unitPrice.toLocaleString('en-US')} = {(c.qty * c.unitPrice).toLocaleString('en-US')} gp
              </span>
              <span className="dim num">{(c.expiresTick - tick).toLocaleString('en-US')}t left</span>
              <button
                className="chip"
                disabled={!ready}
                title={ready ? 'deliver from inventory' : `need ${c.qty - have} more in inventory`}
                onClick={() => onCommand({ type: 'fulfillContract', contractId: c.id })}
              >
                deliver
              </button>
            </li>
          );
        })}
        {view.contracts.length === 0 && <li className="dim">no contracts posted — check back later</li>}
      </ul>
      <p className="dim small">the quartermaster pays 15–35% over market — acquire and deliver</p>
    </section>
  );
}
