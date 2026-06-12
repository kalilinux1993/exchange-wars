import { GEAR, levelsOf } from '@exchange-wars/engine';
import type { AgentState, ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { bestAffordableUpgrade, gearDelta } from '../game';
import { ItemIcon } from './Icon';

/** Compact "+A atk +D def" for a gear piece (only the non-zero stats). */
function statLabel(g: { atk: number; def: number }): string {
  return [g.atk > 0 ? `⚔+${g.atk}` : '', g.def > 0 ? `🛡+${g.def}` : ''].filter(Boolean).join(' ');
}

/**
 * Adventure-tab equipment manager (Jesse-requested): your owned gear, each
 * showing the stats it grants, its level requirement, and whether equipping it
 * BEATS what you currently wear (via gearDelta) — plus equip / unequip /
 * equip-best. The combat-side companion to the Exchange Ledger's sell-focused
 * inventory; reads agent state, mutates only through onCommand.
 */
export function GearManager({
  agent,
  items,
  onCommand,
  view,
  onBuy,
}: {
  agent: AgentState | undefined;
  items: ItemDef[];
  onCommand: (cmd: PlayerCommand) => void;
  /** When provided (markets + gp), surfaces the best affordable upgrade to buy. */
  view?: PlayerView;
  /** Jump to the Exchange with this item loaded — makes the "best buy" one-click actionable. */
  onBuy?: ((itemId: string) => void) | undefined;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const wikiOf = new Map(items.map((i) => [i.id, i.wikiId]));
  const inv = agent?.inventory ?? {};
  const worn = agent?.worn ?? {};
  const lvls = levelsOf(agent?.combatXp);
  // The strongest gear upgrade you could BUY and use right now — names the next move.
  const pick = view ? bestAffordableUpgrade(worn, lvls, view.gp, view.markets, inv) : null;
  // Owned gear, each with its upgrade verdict, ordered most-actionable-first:
  // wearable upgrades by biggest gain, then sidegrades/downgrades, then the
  // locked (under-level) pieces last — so what's worth equipping is up top.
  const ownedGear = items
    .filter((i) => (inv[i.id] ?? 0) > 0 && GEAR[i.id] !== undefined)
    .map((i) => ({ item: i, gd: gearDelta(i.id, worn, lvls)! }))
    .sort((a, b) => {
      if (a.gd.usable !== b.gd.usable) return a.gd.usable ? -1 : 1; // locked sinks
      if (b.gd.delta !== a.gd.delta) return b.gd.delta - a.gd.delta; // biggest upgrade first
      return a.item.name < b.item.name ? -1 : 1;
    });
  const wornSlots = Object.entries(worn);

  return (
    <div className="gearmanager">
      <h3>
        Equipment{' '}
        {ownedGear.length > 0 && (
          <button className="chip" title="equip the best usable piece you own in every slot, in one tap" onClick={() => onCommand({ type: 'equipBest' })}>
            equip best
          </button>
        )}
      </h3>
      {pick && (
        <p
          className="dim small bestbuy"
          title="the strongest gear upgrade you can afford and use right now, by the best ask on the Exchange — buy it there to equip it"
        >
          💰 best buy: <b>{names.get(pick.itemId) ?? pick.itemId}</b>{' '}
          <span className="pct up">
            {pick.skill === 'atk' ? '⚔' : '🛡'}+{pick.delta}
          </span>{' '}
          · {pick.price.toLocaleString('en-US')} gp on the Exchange
          {onBuy && (
            <button className="chip" title="open this item on the Exchange, ready to buy" onClick={() => onBuy(pick.itemId)}>
              → buy
            </button>
          )}
        </p>
      )}
      {wornSlots.length > 0 && (
        <ul className="rows small">
          {wornSlots.map(([slot, itemId]) => {
            const g = GEAR[itemId];
            return (
              <li key={slot}>
                <span>
                  <ItemIcon id={itemId} wikiId={wikiOf.get(itemId)} size={14} className="itemicon" />{' '}
                  {names.get(itemId) ?? itemId}
                </span>
                <span className="dim small">
                  {slot}
                  {g ? ` · ${statLabel(g)}` : ''}
                </span>
                <button className="chip" title="move it back to the satchel" onClick={() => onCommand({ type: 'unequip', slot })}>
                  unequip
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {ownedGear.length === 0 ? (
        <p className="dim small">
          no gear in the satchel — buy weapons &amp; armor on the <b>🪙 Exchange</b>, then equip them here to wear on every dive (worn gear is safe on death).
        </p>
      ) : (
        <ul className="rows small">
          {ownedGear.map(({ item: i, gd }) => {
            const g = GEAR[i.id]!;
            const sk = gd.skill === 'atk' ? 'Attack' : 'Defence';
            const skShort = gd.skill === 'atk' ? 'atk' : 'def';
            const equipped = worn[g.slot] === i.id;
            const vsName = gd.vs ? names.get(gd.vs) ?? gd.vs : null;
            return (
              <li key={i.id}>
                <span>
                  <ItemIcon id={i.id} wikiId={i.wikiId} size={14} className="itemicon" /> {i.name}
                </span>
                <span
                  className="dim small"
                  title={`${i.name}: ${statLabel(g) || 'no combat stats'} · ${g.slot} · needs ${sk} ${g.req} to wear`}
                >
                  {statLabel(g)} · needs {sk} {g.req}
                </span>
                {equipped ? (
                  <span className="delta up" title="you're wearing this">✓ worn</span>
                ) : !gd.usable ? (
                  <span className="delta lock" title={`hold to equip once you train ${sk} to ${g.req}`}>🔒 {sk} {g.req}</span>
                ) : (
                  <>
                    {gd.delta > 0 ? (
                      <span className="delta up" title={vsName ? `+${gd.delta} ${sk} over your ${vsName}` : `fills your empty ${g.slot} slot`}>
                        ↑ +{gd.delta} {skShort}
                      </span>
                    ) : gd.delta < 0 ? (
                      <span className="delta down" title={`${gd.delta} ${sk} vs your ${vsName} — a downgrade`}>
                        ↓ {gd.delta} {skShort}
                      </span>
                    ) : (
                      <span className="dim small" title={vsName ? `same ${sk} as your ${vsName}` : 'no change'}>= no gain</span>
                    )}
                    <button className="chip" title={`equip your ${i.name}`} onClick={() => onCommand({ type: 'equip', itemId: i.id })}>
                      equip
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
