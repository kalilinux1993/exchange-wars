import {
  CONSUMABLES,
  GEAR,
  MONSTERS,
  REGION_CLEAR_KILLS,
  REGIONS,
  deriveStats,
  levelsOf,
  maxHpFor,
  monsterById,
  regionIndex,
} from '@exchange-wars/engine';
import type { PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import { deathRecap, loadLoadouts, MILESTONES, saveLoadouts, type Game } from '../game';
import { CharacterPanel } from './CharacterPanel';
import { CombatScene } from './CombatScene';
import { RegionMap } from './RegionMap';

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
  const [regionId, setRegionId] = useState(REGIONS[0]!.id);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [loadouts, setLoadouts] = useState<Record<string, number>[]>(loadLoadouts);

  // Death detection: an expedition that vanishes mid-combat wasn't extracted.
  // The last-render snapshot lets the toast tell the SPECIFIC story — the
  // engine already burned the evidence by the time we render.
  const prevRef = useRef<{
    active: boolean;
    inCombat: boolean;
    snapshot: { regionId: string; pack: Record<string, number>; packGp: number } | undefined;
  }>({ active: false, inCombat: false, snapshot: undefined });
  useEffect(() => {
    const prev = prevRef.current;
    const now = {
      active: exp !== undefined,
      inCombat: exp?.combat != null,
      snapshot: exp ? { regionId: exp.regionId, pack: { ...exp.pack }, packGp: exp.packGp } : prev.snapshot,
    };
    if (prev.active && prev.inCombat && !now.active && prev.snapshot) {
      const r = deathRecap(game.world.items, prev.snapshot.pack, prev.snapshot.packGp);
      const where = REGIONS[regionIndex(prev.snapshot.regionId)]?.name ?? 'the depths';
      const keptLine = r.kept.length > 0 ? `kept: ${r.kept.join(', ')}` : 'you carried nothing worth keeping';
      const lostLine =
        r.lostUnits > 0 || r.lostGp > 0
          ? ` — the dark kept ${r.lostUnits} item${r.lostUnits === 1 ? '' : 's'} and ${r.lostGp.toLocaleString('en-US')} loot gp`
          : '';
      onToast(`You died in ${where}`, `${keptLine}${lostLine}`);
    }
    prevRef.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exp !== undefined, exp?.combat != null, exp?.packGp, JSON.stringify(exp?.pack ?? null)]);

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
        <CharacterPanel
          agent={agent}
          names={names}
          titles={MILESTONES.filter((m) => game.milestones.includes(m.id)).map((m) => m.name)}
        />
        {resting && (
          <p className="warn small" title="wounds persist between expeditions — rest (or embark hurt, your gamble)">
            ♥ recovering: {agent!.hp}/{trainedMax} hp — mending as the market ticks
          </p>
        )}
        {(view.upgrades['sellsword'] ?? 0) > 0 && (
          <p className="dim small">
            🗡 sellsword: {agent?.sellsword ? 'hunting the shallows while you trade' : 'resting at the inn'}{' '}
            <button
              className="chip"
              title="the hireling runs conservative expeditions on its own — shallow regions only, flees danger, never gambles your kit"
              onClick={() => onCommand({ type: 'configureSellsword', active: !agent?.sellsword })}
            >
              {agent?.sellsword ? 'call back' : 'send out'}
            </button>
          </p>
        )}
        {tally && (
          <p className="dim small">
            tally: {st.monstersSlain ?? 0} slain · {st.cacheFinds ?? 0} caches · {st.diceWon ?? 0} dice won ·
            deepest {REGIONS[st.deepestRegion ?? 0]?.name ?? '—'}
            {(st.deaths ?? 0) > 0 ? ` · ${st.deaths}† deaths` : ''}
          </p>
        )}
        {(st.monstersSlain ?? 0) > 0 && (
          <details className="bestiary">
            <summary className="dim small">
              Bestiary ({Object.keys(st.killsByMonster ?? {}).length}/{MONSTERS.length} met)
            </summary>
            <ul className="rows small">
              {MONSTERS.map((m) => {
                const kills = st.killsByMonster?.[m.id] ?? 0;
                if (kills === 0) {
                  return (
                    <li key={m.id} className="dim">
                      <span>???</span>
                      <span className="dim small">{m.elite ? 'a named terror, unmet' : 'unmet'}</span>
                    </li>
                  );
                }
                return (
                  <li key={m.id}>
                    <span>
                      {m.elite ? '★ ' : ''}
                      {m.name}
                      {m.dragonfire ? ' 🔥' : ''}
                    </span>
                    <span className="dim small">
                      {m.gp[0]}–{m.gp[1]} gp
                      {m.drops.length > 0
                        ? ` · drops ${m.drops.map((d) => `${(names.get(d.itemId) ?? d.itemId).toLowerCase()} ${Math.round(d.chance * 100)}%`).join(', ')}`
                        : ''}
                    </span>
                    <span className="num">×{kills}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
        <RegionMap progress={progress} selected={regionId} onSelect={setRegionId} />
        <p className="dim small">{REGIONS[regionIndex(regionId)]?.flavor}</p>
        <h3>Pack &amp; Equip</h3>
        <p className="dim small">
          There's no separate equip slot — <b>gear you pack is worn automatically</b> (the best usable item per
          slot fights for you). Tap <b>equip best</b> to auto-pack your strongest kit, or add items by hand
          below. Gear above your level (🔒) is inert until you train.{' '}
          <button
            className="chip"
            title="auto-pack the best usable weapon + armor you own (best per slot)"
            onClick={() => {
              const best: Record<string, { id: string; score: number }> = {};
              for (const [id, qty] of Object.entries(view.inventory)) {
                if (qty < 1) continue;
                const g = GEAR[id];
                if (!g) continue;
                if ((g.slot === 'weapon' ? lvls.atk : lvls.def) < g.req) continue; // inert — skip
                const score = g.atk + g.def;
                if (!best[g.slot] || score > best[g.slot]!.score) best[g.slot] = { id, score };
              }
              setDraft((d) => {
                const next: Record<string, number> = {};
                for (const [id, q] of Object.entries(d)) if (!GEAR[id]) next[id] = q; // keep food/brews
                for (const v of Object.values(best)) next[v.id] = 1; // wear best per slot
                return next;
              });
            }}
          >
            ⚔ equip best
          </button>
        </p>
        {(() => {
          const draftUnits = Object.values(draft).reduce((a, b) => a + b, 0);
          const label = (lo: Record<string, number>): string => {
            const entries = Object.entries(lo).filter(([, q]) => q > 0);
            if (entries.length === 0) return 'empty';
            const first = names.get(entries[0]![0]) ?? entries[0]![0];
            return entries.length === 1 ? `${first} ×${entries[0]![1]}` : `${first} +${entries.length - 1}`;
          };
          const applyLoadout = (lo: Record<string, number>): void => {
            const next: Record<string, number> = {};
            for (const [id, q] of Object.entries(lo)) {
              const held = view.inventory[id] ?? 0; // clamp to what you actually hold now
              if (held > 0) next[id] = Math.min(q, held);
            }
            setDraft(next);
          };
          const saveCurrent = (): void => {
            const pack: Record<string, number> = {};
            for (const [id, q] of Object.entries(draft)) if (q > 0) pack[id] = q;
            if (Object.keys(pack).length === 0) return;
            const next = [pack, ...loadouts].slice(0, 4);
            setLoadouts(next);
            saveLoadouts(next);
          };
          const removeLoadout = (idx: number): void => {
            const next = loadouts.filter((_, j) => j !== idx);
            setLoadouts(next);
            saveLoadouts(next);
          };
          if (loadouts.length === 0 && draftUnits === 0) return null;
          return (
            <p className="dim small loadouts">
              loadouts:{' '}
              {loadouts.map((lo, i) => (
                <span key={i}>
                  <button className="chip" title="fill the pack from this saved kit (clamped to what you hold)" onClick={() => applyLoadout(lo)}>
                    {label(lo)}
                  </button>
                  <button className="chip" title="forget this loadout" onClick={() => removeLoadout(i)}>
                    ×
                  </button>{' '}
                </span>
              ))}
              {draftUnits > 0 && loadouts.length < 4 && (
                <button className="chip" title="save the current pack as a loadout" onClick={saveCurrent}>
                  + save kit
                </button>
              )}
            </p>
          );
        })()}
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
                  : CONSUMABLES[id]!.boostAtk || CONSUMABLES[id]!.boostDef
                    ? `⚗ brew ${CONSUMABLES[id]!.boostAtk ? `+${CONSUMABLES[id]!.boostAtk} atk ` : ''}${CONSUMABLES[id]!.boostDef ? `+${CONSUMABLES[id]!.boostDef} def` : ''} (whole dive)`
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
        {exp.boost ? ` · ⚗ brew ${exp.boost.atk ? `+${exp.boost.atk} atk ` : ''}${exp.boost.def ? `+${exp.boost.def} def` : ''}` : ''}
      </p>
      {!exp.combat && (
        <div className="hpbar" title="your hp">
          <div className="hpfill" style={{ width: `${hpPct}%` }} />
        </div>
      )}
      {exp.combat ? (
        <>
          {(() => {
            const m = monsterById(exp.combat!.monsterId);
            return (
              <>
                <CombatScene
                  monsterId={exp.combat!.monsterId}
                  monsterHp={exp.combat!.monsterHp}
                  playerHp={exp.combat!.playerHp}
                  playerMaxHp={exp.combat!.maxHp ?? trainedMax}
                  logLen={exp.combat!.log.length}
                  geared={Object.keys(exp.pack).some((id) => GEAR[id] !== undefined && (exp.pack[id] ?? 0) > 0)}
                />
                <p className="small">
                  <b>{m.name}</b> — {Math.max(0, exp.combat!.monsterHp)}/{m.hp} hp · you{' '}
                  {Math.max(0, exp.combat!.playerHp)}/{exp.combat!.maxHp ?? trainedMax}
                </p>
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
            <button
              className="chip"
              title="swing until it's settled — drinks antifire against breath, eats when badly hurt, and hands back control if food runs out while you're low (each round still costs a tick)"
              onClick={() => {
                // Auto-resolve: the same logged commands a player would issue,
                // just faster fingers. Replay- and leaderboard-identical.
                const agent = game.world.agents[game.playerId];
                let guard = 0;
                while (agent?.expedition?.combat && guard++ < 100) {
                  const e = agent.expedition;
                  const c = e.combat!;
                  const max = c.maxHp ?? trainedMax;
                  const breath = monsterById(c.monsterId).dragonfire === true && !c.antifire;
                  const potion = (e.pack['super_antifire_potion_4'] ?? 0) > 0;
                  const food = ['shark', 'cooked_karambwan', 'prayer_regeneration_potion_4'].find(
                    (f) => (e.pack[f] ?? 0) > 0,
                  );
                  if (breath && potion) onCommand({ type: 'eatFood', itemId: 'super_antifire_potion_4' });
                  else if (c.playerHp < Math.ceil(max * 0.4) && food) onCommand({ type: 'eatFood', itemId: food });
                  else if (c.playerHp < Math.ceil(max * 0.25)) break; // too risky without a plan — your call now
                  else onCommand({ type: 'fight' });
                }
              }}
            >
              fight it out
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
              {{ shrine: 'pay the tithe', gamble: 'roll the dice', portal: 'step through', imp: 'chase it', merchant: 'pay up', spar: 'take the lesson', toll: 'pay the toll' }[
                exp.event.kind
              ] ?? 'accept'}
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
          {foods.map(([id, qty]) => (
            <button
              key={id}
              className="chip"
              title="a camp meal — time passes while you eat; antifire coats the whole dive"
              onClick={() => onCommand({ type: 'eatFood', itemId: id })}
            >
              eat {names.get(id) ?? id} ({qty})
            </button>
          ))}
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
