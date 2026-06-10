import { PROGRESSION, TUNING } from '@exchange-wars/engine';
import type { PlayerCommand, PlayerView } from '@exchange-wars/engine';

export function UpgradeShop({ view, onCommand }: { view: PlayerView; onCommand: (cmd: PlayerCommand) => void }) {
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
      <p className="dim small">automation works while you're away — fast-forward to collect</p>
    </section>
  );
}
