import { GEAR, levelsOf } from '@exchange-wars/engine';
import type { AgentState, ItemDef, PlayerCommand } from '@exchange-wars/engine';
import { gearDelta } from '../game';
import { Icon, itemIcon } from './Icon';

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
}: {
  agent: AgentState | undefined;
  items: ItemDef[];
  onCommand: (cmd: PlayerCommand) => void;
}) {
  const names = new Map(items.map((i) => [i.id, i.name]));
  const inv = agent?.inventory ?? {};
  const worn = agent?.worn ?? {};
  const lvls = levelsOf(agent?.combatXp);
  const ownedGear = items.filter((i) => (inv[i.id] ?? 0) > 0 && GEAR[i.id] !== undefined);
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
      {wornSlots.length > 0 && (
        <ul className="rows small">
          {wornSlots.map(([slot, itemId]) => {
            const g = GEAR[itemId];
            return (
              <li key={slot}>
                <span>
                  <Icon name={itemIcon(itemId).name} glyph={itemIcon(itemId).glyph} size={14} className="itemicon" />{' '}
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
          {ownedGear.map((i) => {
            const g = GEAR[i.id]!;
            const gd = gearDelta(i.id, worn, lvls)!;
            const sk = gd.skill === 'atk' ? 'Attack' : 'Defence';
            const skShort = gd.skill === 'atk' ? 'atk' : 'def';
            const equipped = worn[g.slot] === i.id;
            const vsName = gd.vs ? names.get(gd.vs) ?? gd.vs : null;
            return (
              <li key={i.id}>
                <span>
                  <Icon name={itemIcon(i.id).name} glyph={itemIcon(i.id).glyph} size={14} className="itemicon" /> {i.name}
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
