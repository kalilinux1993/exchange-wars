import { GEAR, levelsOf } from '@exchange-wars/engine';
import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { bidWalk, gearDelta, lootSpoils, orderAge, STALE_ORDER_TICKS, type Game } from '../game';
import { ItemIcon } from './Icon';

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
  const names = new Map(items.map((i) => [i.id, i.name]));
  const wikiOf = new Map(items.map((i) => [i.id, i.wikiId]));
  // Combat levels (display-only read) decide whether a satchel piece is wearable
  // yet — drives the upgrade-delta badge that makes "is this gear better?" legible.
  const lvls = levelsOf(game.world.agents[game.playerId]?.combatXp);
  const held = items.filter((i) => (view.inventory[i.id] ?? 0) > 0);
  // Selling at the walk's floor fills the whole walkable qty instantly —
  // realize exactly what the honest mark says the bids would pay (8w).
  const sellable = held
    .map((i) => ({ item: i, walk: bidWalk(game, i.id, view.inventory[i.id] ?? 0) }))
    .filter((s) => s.walk !== null);
  // Bulk "sell the spoils" dumps loot only — your gear stays in the satchel.
  const spoilIds = lootSpoils(
    sellable.map((s) => s.item.id),
    (id) => GEAR[id] !== undefined,
  );
  const dump = (itemId: string): void => {
    const walk = bidWalk(game, itemId, view.inventory[itemId] ?? 0);
    if (walk) onCommand({ type: 'place', itemId, side: 'sell', price: walk.floor, qty: walk.qty });
  };
  return (
    <section className="panel player">
      <h2>Ledger</h2>
      <h3>Inventory</h3>
      {held.some((i) => GEAR[i.id] !== undefined) && (
        <p className="dim small">
          ⚔ <b>equip</b> gear here to wear it on every dive (it overrides your pack and is safe on death), or pack it
          manually in the <b>⚔ Adventure</b> tab.{' '}
          <button
            className="chip"
            title="equip the best usable piece you own in every slot, in one click"
            onClick={() => onCommand({ type: 'equipBest' })}
          >
            equip best
          </button>
        </p>
      )}
      <ul className="rows">
        {held.map((i) => {
          const qty = view.inventory[i.id] ?? 0;
          const walk = bidWalk(game, i.id, qty);
          return (
            <li key={i.id}>
              <span>
                <ItemIcon id={i.id} wikiId={i.wikiId} size={14} className="itemicon" /> {i.name}
              </span>
              <span className="num" title="what you'd RECEIVE selling into the resting bids right now — after the 2% GE tax (18o)">
                {qty.toLocaleString('en-US')} · realize ≈{(walk?.net ?? 0).toLocaleString('en-US')} gp
              </span>
              {(() => {
                const gd = gearDelta(i.id, view.worn, lvls);
                if (!gd) return null;
                const sk = gd.skill === 'atk' ? 'Attack' : 'Defence';
                const glyph = gd.skill === 'atk' ? '⚔' : '🛡';
                const vsName = gd.vs ? names.get(gd.vs) ?? gd.vs : null;
                const badge = !gd.usable ? (
                  <span className="delta lock" title={`hold to equip once you train ${sk} to ${gd.req}`}>
                    🔒 {gd.skill === 'atk' ? 'Atk' : 'Def'} {gd.req}
                  </span>
                ) : gd.delta > 0 ? (
                  <span className="delta up" title={`+${gd.delta} ${sk}${vsName ? ` over your ${vsName}` : ' — this slot is empty'} if you equip it`}>
                    {glyph}+{gd.delta}
                  </span>
                ) : gd.delta < 0 ? (
                  <span className="delta down" title={`${gd.delta} ${sk} vs your ${vsName} — a downgrade`}>
                    {glyph}{gd.delta}
                  </span>
                ) : (
                  <span className="dim small" title={vsName ? `same ${sk} as your ${vsName}` : 'no change'}>
                    no gain
                  </span>
                );
                return (
                  <>
                    {badge}
                    <button
                      className="chip"
                      title={`equip — needs ${sk} ${gd.req}`}
                      onClick={() => onCommand({ type: 'equip', itemId: i.id })}
                    >
                      equip
                    </button>
                  </>
                );
              })()}
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
            <span className="dim" title="what you'd realize dumping the whole satchel into the resting bids now — after the 2% GE tax (18o)">satchel, after tax</span>
            <span className="num">
              ≈
              {held
                .reduce((total, i) => total + (bidWalk(game, i.id, view.inventory[i.id] ?? 0)?.net ?? 0), 0)
                .toLocaleString('en-US')}{' '}
              gp
            </span>
            {spoilIds.length > 1 && (
              <button
                className="chip"
                title="sell every non-gear stack into the resting bids — your raiding kit is kept (sell gear one stack at a time)"
                onClick={() => {
                  for (const id of spoilIds) dump(id);
                }}
              >
                sell the spoils
              </button>
            )}
          </li>
        )}
      </ul>
      {Object.keys(view.worn).length > 0 && (
        <>
          <h3>Equipped</h3>
          <ul className="rows">
            {Object.entries(view.worn).map(([slot, itemId]) => (
              <li key={slot}>
                <span>
                  <ItemIcon id={itemId} wikiId={wikiOf.get(itemId)} size={14} className="itemicon" />{' '}
                  {names.get(itemId) ?? itemId}
                </span>
                <span className="dim small">{slot}</span>
                <button className="chip" title="move it back to the satchel" onClick={() => onCommand({ type: 'unequip', slot })}>
                  unequip
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
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
        {view.openOrders.map((o) => {
          const age = orderAge(game.world, o); // ticks resting (from world.books — display read, 18i)
          const stale = age !== null && age >= STALE_ORDER_TICKS;
          return (
            <li key={o.id} className={stale ? 'stale' : undefined}>
              <span className={`badge ${o.side}`}>{o.side}</span>
              <span>{o.itemId.replace(/_/g, ' ')}</span>
              <span className="num">
                {o.remaining} @ {o.price.toLocaleString('en-US')}
                {age !== null && (
                  <span
                    className={stale ? 'dim small stale' : 'dim small'}
                    title={stale ? 'resting a long time unfilled — the market likely moved away; re-price or abort this dead capital' : 'how long this offer has rested unfilled'}
                  >
                    {' '}· {stale ? '⏳ ' : ''}rested {age.toLocaleString('en-US')}t
                  </span>
                )}
              </span>
              <button className="chip danger" onClick={() => onCommand({ type: 'cancel', itemId: o.itemId, side: o.side })}>
                abort
              </button>
            </li>
          );
        })}
        {view.openOrders.length === 0 && <li className="dim">no open offers</li>}
      </ul>
    </section>
  );
}
