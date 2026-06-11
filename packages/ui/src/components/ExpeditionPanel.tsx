import {
  CONSUMABLES,
  GEAR,
  REGION_CLEAR_KILLS,
  REGIONS,
  deriveStats,
  levelsOf,
  maxHpFor,
  monsterById,
  regionIndex,
  xpForLevel,
} from '@exchange-wars/engine';
import type { PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import type { Game } from '../game';

/**
 * The Expeditions panel: outfit an adventurer from your REAL inventory,
 * delve the node graph, fight one round per click. Reads world state for
 * display; every mutation goes through onCommand (the player surface).
 */
export function ExpeditionPanel({
  game,
  view,
  onCommand,
  onToast,
}: {
  game: Game;
  view: PlayerView;
  onCommand: (cmd: PlayerCommand) => void;
  onToast: (name: string, flavor: string) => void;
}) {
  const agent = game.world.agents[game.playerId];
  const exp = agent?.expedition;
  const progress = agent?.questProgress ?? 0;
  const lvls = levelsOf(agent?.combatXp);
  const trainedMax = maxHpFor(lvls.hp);
  const xpLine = (stat: 'atk' | 'def' | 'hp'): string => {
    const lvl = lvls[stat];
    if (lvl >= 99) return `${lvl}`;
    const cur = agent?.combatXp?.[stat] ?? 0;
    return `${lvl} (${cur - xpForLevel(lvl)}/${xpForLevel(lvl + 1) - xpForLevel(lvl)} xp)`;
  };
  const [regionId, setRegionId] = useState(REGIONS[0]!.id);
  const [draft, setDraft] = useState<Record<string, number>>({});

  // Death detection: an expedition that vanishes mid-combat wasn't extracted.
  const prevRef = useRef<{ active: boolean; inCombat: boolean }>({ active: false, inCombat: false });
  useEffect(() => {
    const prev = prevRef.current;
    const now = { active: exp !== undefined, inCombat: exp?.combat != null };
    if (prev.active && prev.inCombat && !now.active) {
      onToast('You died in the depths', 'your 3 most valuable carried items made it home — the rest is gone');
    }
    prevRef.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exp !== undefined, exp?.combat != null]);

  const relevant = Object.entries(view.inventory)
    .filter(([id, qty]) => qty > 0 && (GEAR[id] !== undefined || CONSUMABLES[id] !== undefined))
    .sort(([a], [b]) => (a < b ? -1 : 1));

  const bump = (id: string, delta: number, max: number): void =>
    setDraft((d) => {
      const next = Math.max(0, Math.min(max, (d[id] ?? 0) + delta));
      return { ...d, [id]: next };
    });

  const names = new Map(game.world.items.map((i) => [i.id, i.name]));

  if (!exp) {
    const idx = regionIndex(regionId);
    const locked = idx > progress;
    const st = game.world.stats;
    const tally =
      (st.monstersSlain ?? 0) > 0 || (st.cacheFinds ?? 0) > 0 || (st.diceWon ?? 0) > 0;
    const resting = agent?.hp !== undefined && agent.hp < trainedMax;
    return (
      <section className="panel expedition">
        <h2>Expeditions</h2>
        <p className="dim small" title="Attack trains as you deal damage and unlocks weapons; Defence trains as you take it and unlocks armor; Hitpoints harden as you fight (+2 max hp per level)">
          ⚔ Attack {xpLine('atk')} · 🛡 Defence {xpLine('def')} · ♥ Hitpoints {xpLine('hp')} ({trainedMax} max)
        </p>
        {resting && (
          <p className="warn small" title="wounds persist between expeditions — rest (or embark hurt, your gamble)">
            ♥ recovering: {agent!.hp}/{trainedMax} hp — mending as the market ticks
          </p>
        )}
        {tally && (
          <p className="dim small">
            tally: {st.monstersSlain ?? 0} slain · {st.cacheFinds ?? 0} caches · {st.diceWon ?? 0} dice won ·
            deepest {REGIONS[st.deepestRegion ?? 0]?.name ?? '—'}
          </p>
        )}
        <ul className="rows small regions">
          {REGIONS.map((r, i) => (
            <li
              key={r.id}
              className={i > progress ? 'dim' : regionId === r.id ? 'selected-region' : ''}
              onClick={() => i <= progress && setRegionId(r.id)}
            >
              <span>{i > progress ? '🔒' : i === progress ? '⚑' : '✓'}</span>
              <span>{r.name}</span>
              <span className="dim small">{r.flavor}</span>
            </li>
          ))}
        </ul>
        <h3>Pack (from your satchel)</h3>
        {relevant.length === 0 && <p className="dim small">buy gear and food on the exchange first — or go in swinging fists</p>}
        <ul className="rows small">
          {relevant.map(([id, held]) => {
            const g = GEAR[id];
            const inert = g !== undefined && (g.slot === 'weapon' ? lvls.atk : lvls.def) < g.req;
            return (
            <li key={id} className={inert ? 'dim' : ''} title={inert ? `requires ${g!.slot === 'weapon' ? 'Attack' : 'Defence'} ${g!.req} — carried gear below your level is inert` : undefined}>
              <span>{names.get(id) ?? id}</span>
              <span className="dim small">
                {g
                  ? `atk ${g.atk} def ${g.def} · req ${g.slot === 'weapon' ? '⚔' : '🛡'}${g.req}${inert ? ' 🔒' : ''}`
                  : `heals ${CONSUMABLES[id]!.heal}`}
              </span>
              <span className="num">
                <button className="chip" onClick={() => bump(id, -1, held)}>
                  −
                </button>{' '}
                {draft[id] ?? 0}/{held}{' '}
                <button className="chip" onClick={() => bump(id, 1, held)}>
                  +
                </button>
              </span>
            </li>
            );
          })}
        </ul>
        <button
          className="submit buy"
          disabled={locked}
          onClick={() => {
            const pack: Record<string, number> = {};
            for (const [id, qty] of Object.entries(draft)) if (qty > 0) pack[id] = qty;
            onCommand({ type: 'startExpedition', regionId, pack });
            setDraft({});
          }}
        >
          embark{locked ? ' (locked)' : ''}
        </button>
      </section>
    );
  }

  const region = REGIONS[regionIndex(exp.regionId)]!;
  const stats = deriveStats(exp.pack, lvls);
  const hpPct = Math.min(100, Math.round(((exp.combat ? exp.combat.playerHp : exp.hp) / trainedMax) * 100));
  const foods = Object.entries(exp.pack).filter(([id, qty]) => qty > 0 && CONSUMABLES[id] !== undefined);

  return (
    <section className="panel expedition">
      <h2>Expeditions · {region.name}</h2>
      <p className="dim small">
        atk {stats.atk} · def {stats.def} · cleared {exp.cleared}
        {regionIndex(exp.regionId) === progress ? `/${REGION_CLEAR_KILLS} to unlock the next region` : ''} · loot{' '}
        {exp.packGp.toLocaleString('en-US')} gp
        {exp.antifire ? ' · 🛡🔥 antifire holds for this dive' : ''}
      </p>
      <div className="hpbar" title="your hp">
        <div className="hpfill" style={{ width: `${hpPct}%` }} />
      </div>
      {exp.combat ? (
        <>
          {(() => {
            const m = monsterById(exp.combat!.monsterId);
            const mPct = Math.round((Math.max(0, exp.combat!.monsterHp) / m.hp) * 100);
            return (
              <>
                <p className="small">
                  <b>{m.name}</b> — {Math.max(0, exp.combat!.monsterHp)}/{m.hp} hp
                </p>
                <div className="hpbar foe" title={`${m.name} hp`}>
                  <div className="hpfill" style={{ width: `${mPct}%` }} />
                </div>
              </>
            );
          })()}
          <ul className="rows small combatlog">
            {exp.combat.log.slice(-5).map((line, i) => (
              <li key={`${exp.combat!.log.length}-${i}`}>{line}</li>
            ))}
          </ul>
          <div className="controls">
            <button className="chip" title="one round — the market moves one tick" onClick={() => onCommand({ type: 'fight' })}>
              fight
            </button>
            <button className="chip" title="one round — the market moves one tick" onClick={() => onCommand({ type: 'fleeCombat' })}>
              flee
            </button>
            {foods.map(([id, qty]) => (
              <button key={id} className="chip" onClick={() => onCommand({ type: 'eatFood', itemId: id })}>
                eat {names.get(id) ?? id} ({qty})
              </button>
            ))}
          </div>
        </>
      ) : exp.event ? (
        <>
          <p className="small">⚖ {exp.event.prompt}</p>
          <div className="controls">
            <button className="chip" onClick={() => onCommand({ type: 'choose', accept: true })}>
              {exp.event.kind === 'shrine' ? 'pay the tithe' : 'roll the dice'}
            </button>
            <button className="chip" onClick={() => onCommand({ type: 'choose', accept: false })}>
              walk on
            </button>
          </div>
        </>
      ) : (
        <div className="controls">
          <button className="chip" title="each step takes time — the market moves one tick" onClick={() => onCommand({ type: 'advance' })}>
            venture deeper (+1 tick)
          </button>
          <button
            className="chip"
            onClick={() => {
              const gp = exp.packGp;
              const kills = exp.cleared;
              onCommand({ type: 'extract' });
              onToast(
                'Back from the depths',
                `${kills} kill${kills === 1 ? '' : 's'} · ${gp.toLocaleString('en-US')} loot gp — sell the spoils on the exchange`,
              );
            }}
          >
            extract (keep everything)
          </button>
        </div>
      )}
      {!exp.combat && (exp.journal?.length ?? 0) > 0 && (
        <ul className="rows small combatlog">
          {exp.journal!.slice(-4).map((line, i) => (
            <li key={`${exp.journal!.length}-${i}`} className="dim">
              {line}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
