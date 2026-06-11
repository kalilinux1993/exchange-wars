import { PROGRESSION, TUNING } from '@exchange-wars/engine';
import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';

/** A representative cheap-rune price for the clerk-reach example — just a
 * concrete number to make the unit cap legible (the clerk's actual fills
 * vary with the live ask). */
const EXAMPLE_PRICE = 22;

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
            {conf
              ? ` · ≤${conf.maxQty} units/flip · ${conf.maxFlips} at once · every ${conf.cadence} ticks · ≤${Math.round(conf.maxVolatility * 100)}% vol`
              : ''}
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
      {conf && (
        <p className="dim small" title="the clerk sizes trades by UNIT COUNT, not your purse — so cheap goods mean small gp per flip no matter how rich you are">
          the clerk buys at most <b>{conf.maxQty}</b> units a flip, so on a {EXAMPLE_PRICE}-gp rune that's ~
          {(conf.maxQty * EXAMPLE_PRICE).toLocaleString('en-US')} gp — your bankroll barely matters here.
          {conf.maxVolatility < 0.12
            ? ' This junior trades only calm cheap goods; tier 2 unlocks the big ≥5k-gp staples where the real profit is.'
            : ' It works the big ≥5k-gp staples now — that 8-unit cap on a 6k staple is ~48k a flip.'}{' '}
          For exotics or anything bigger, <b>flip it yourself</b> in the Exchange — manual trades have no unit cap.
        </p>
      )}
      <div className="upgrade">
        <div>
          <b>Sellsword</b>
          <span className="dim">
            {' '}
            {(view.upgrades['sellsword'] ?? 0) > 0
              ? 'hired — toggle the hunt in the Adventure room'
              : 'runs your expeditions while you trade'}
          </span>
        </div>
        <button
          className="chip"
          disabled={
            PROGRESSION.upgrades.sellsword.costs[view.upgrades['sellsword'] ?? 0] === undefined ||
            view.gp < (PROGRESSION.upgrades.sellsword.costs[view.upgrades['sellsword'] ?? 0] ?? Infinity)
          }
          onClick={() => onCommand({ type: 'buyUpgrade', upgradeId: 'sellsword' })}
        >
          {PROGRESSION.upgrades.sellsword.costs[view.upgrades['sellsword'] ?? 0] === undefined
            ? 'hired'
            : `${PROGRESSION.upgrades.sellsword.costs[view.upgrades['sellsword'] ?? 0]!.toLocaleString('en-US')} gp`}
        </button>
      </div>
      <div className="upgrade">
        <div>
          <b>Death Ward</b>
          <span className="dim">
            {' '}
            {(view.upgrades['deathWard'] ?? 0) > 0 ? 'active — keep 5 on death' : 'keep 5 items on death (not 3)'}
          </span>
        </div>
        <button
          className="chip"
          disabled={
            PROGRESSION.upgrades.deathWard.costs[view.upgrades['deathWard'] ?? 0] === undefined ||
            view.gp < (PROGRESSION.upgrades.deathWard.costs[view.upgrades['deathWard'] ?? 0] ?? Infinity)
          }
          onClick={() => onCommand({ type: 'buyUpgrade', upgradeId: 'deathWard' })}
        >
          {PROGRESSION.upgrades.deathWard.costs[view.upgrades['deathWard'] ?? 0] === undefined
            ? 'warded'
            : `${PROGRESSION.upgrades.deathWard.costs[view.upgrades['deathWard'] ?? 0]!.toLocaleString('en-US')} gp`}
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
              {/* Speaks the staple vol ladder: ≥5k staples sit at 0.12 (tier-2/3
                  only), calm staples ≤0.10, cheap goods ≤0.09. */}
              <option value="1">tier max</option>
              <option value="0.1">no big staples (≤10%)</option>
              <option value="0.09">cheap goods only (≤9%)</option>
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
