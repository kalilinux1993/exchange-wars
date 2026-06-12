import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';

/**
 * A contract's premium over the current market price, as a fraction — how much
 * better than just selling on the GE this delivery pays. null when there's no
 * market mark to compare against. Pure; lets the player spot the best deal
 * (the board pays 15–35% but each contract differs). Negative if the market
 * has since spiked above the agreed price — then it's a worse deal than selling.
 */
export function contractPremium(unitPrice: number, marketPrice: number): number | null {
  return marketPrice > 0 ? (unitPrice - marketPrice) / marketPrice : null;
}

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
          const market = view.markets.find((m) => m.itemId === c.itemId)?.lastPrice ?? 0;
          const prem = contractPremium(c.unitPrice, market);
          return (
            <li key={c.id} className={ready ? 'contract ready' : 'contract'}>
              <span>
                {ready ? '✓ ' : ''}
                {c.qty}× {names.get(c.itemId) ?? c.itemId}
              </span>
              <span className="num">
                @ {c.unitPrice.toLocaleString('en-US')} = {(c.qty * c.unitPrice).toLocaleString('en-US')} gp
                {prem !== null && (
                  <span className={prem >= 0 ? 'pct up' : 'pct down'} title="premium over the current market price">
                    {' '}
                    ({prem >= 0 ? '+' : ''}
                    {Math.round(prem * 100)}%)
                  </span>
                )}
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
