import { PROGRESSION, TUNING } from '@exchange-wars/engine';
import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';

export function UpgradeShop({
  view,
  items,
  onCommand,
}: {
  view: PlayerView;
  items: ItemDef[];
  onCommand: (cmd: PlayerCommand) => void;
}) {
  const tier = view.upgrades['autoFlip'] ?? 0;
  const nextTierCost = PROGRESSION.upgrades.autoFlip.costs[tier];
  const conf = tier > 0 ? TUNING.automation.autoFlip[tier - 1] : undefined;
  return (
    <section className="panel shop">
      <h2>Clerk's Counter</h2>
      <div className="upgrade">
        <div>
          <b>Offer slot</b>
          <span className="dim">
            {' '}
            {view.slots}/{PROGRESSION.maxSlots}
          </span>
        </div>
        <button
          className="chip"
          disabled={view.nextSlotCost === null || view.gp < view.nextSlotCost}
          onClick={() => onCommand({ type: 'buySlot' })}
        >
          {view.nextSlotCost === null ? 'maxed' : `${view.nextSlotCost.toLocaleString('en-US')} gp`}
        </button>
      </div>
      <div className="upgrade">
        <div>
          <b>Auto-flipper</b>
          <span className="dim">
            {' '}
            tier {tier}
            {conf ? ` · ${conf.maxFlips} flips · every ${conf.cadence} ticks` : ''}
          </span>
        </div>
        <button
          className="chip"
          disabled={nextTierCost === undefined || view.gp < nextTierCost}
          onClick={() => onCommand({ type: 'buyUpgrade', upgradeId: 'autoFlip' })}
        >
          {nextTierCost === undefined ? 'maxed' : `${nextTierCost.toLocaleString('en-US')} gp`}
        </button>
      </div>
      <h3>Clerk Orders</h3>
      {tier === 0 ? (
        <p className="dim small">hire the clerk to give orders</p>
      ) : (
        <div className="orders-grid">
          <label>
            risk
            <select
              value={String(view.botConfig.maxVolatility ?? 1)}
              onChange={(e) => onCommand({ type: 'configureBot', maxVolatility: Number(e.target.value) })}
            >
              <option value="1">tier max</option>
              <option value="0.08">steady (≤8%)</option>
              <option value="0.06">cautious (≤6%)</option>
            </select>
          </label>
          <label>
            capital
            <select
              value={String(view.botConfig.capitalFraction ?? 0.25)}
              onChange={(e) => onCommand({ type: 'configureBot', capitalFraction: Number(e.target.value) })}
            >
              <option value="0.1">10%</option>
              <option value="0.25">25%</option>
              <option value="0.4">40%</option>
            </select>
          </label>
          <label>
            focus
            <select
              value={view.botConfig.focusItemId ?? ''}
              onChange={(e) =>
                onCommand({ type: 'configureBot', focusItemId: e.target.value === '' ? null : e.target.value })
              }
            >
              <option value="">all goods</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="dim small">automation works while you're away — fast-forward to collect</p>
    </section>
  );
}
