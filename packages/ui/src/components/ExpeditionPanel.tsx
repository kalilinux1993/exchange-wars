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
import { useEffect, useRef } from 'react';
import { combatForecast, deathRecap, healFromPack, MILESTONES, summarizeDelve, type DelveRecord, type Game } from '../game';
import { CharacterPanel } from './CharacterPanel';
import { GearManager } from './GearManager';
import { CombatScene } from './CombatScene';
import { Icon, itemIcon } from './Icon';
import { MonsterGlyph } from './MonsterBody';

/**
 * The hardest-hitting foe that stalks a region — its monster pool plus any
 * named elite — for an at-a-glance danger read before you embark, to weigh
 * against your own Attack/Defence. Pure: reads MONSTERS via monsterById.
 */
export function regionDanger(region: { monsters: string[]; elite?: string }): {
  atk: number;
  def: number;
  hp: number;
  elite: boolean;
  /** Worst per-round loot-gp drain among the region's foes (0 = none) — the Abyss bites. */
  leech: number;
} {
  const ids = region.elite ? [...region.monsters, region.elite] : region.monsters;
  let worst = { atk: 0, def: 0, hp: 0 };
  let leech = 0;
  for (const id of ids) {
    const m = monsterById(id);
    if (m.atk + m.def > worst.atk + worst.def) worst = { atk: m.atk, def: m.def, hp: m.hp };
    if (m.leech && m.leech > leech) leech = m.leech;
  }
  return { ...worst, elite: region.elite !== undefined, leech };
}

/**
 * The Expeditions panel: outfit an adventurer from your REAL inventory,
 * delve the node graph, fight one round per click. Reads world state for
 * display; every mutation goes through onCommand (the player surface).
 */
export function ExpeditionPanel({
  game,
  view,
  onCommand,
  onRest,
  onToast,
  onDelveEnd,
  onBuy,
}: {
  game: Game;
  view: PlayerView;
  onCommand: (cmd: PlayerCommand) => void;
  /** Fast-forward N ticks (UI time-advance, not a player command) — drives "rest to full". */
  onRest?: (ticks: number) => void;
  onToast: (name: string, flavor: string) => void;
  /** Called once when an expedition ends (death or extract) with its Delve Log entry. */
  onDelveEnd?: (record: DelveRecord) => void;
  /** Jump to the Exchange with an item loaded — powers the GearManager "best buy → buy". */
  onBuy?: (itemId: string) => void;
}) {
  const agent = game.world.agents[game.playerId];
  const exp = agent?.expedition;
  const progress = agent?.questProgress ?? 0;
  const lvls = levelsOf(agent?.combatXp);
  const trainedMax = maxHpFor(lvls.hp);

  // Death detection: an expedition that vanishes mid-combat wasn't extracted.
  // The last-render snapshot lets the toast tell the SPECIFIC story — the
  // engine already burned the evidence by the time we render.
  const prevRef = useRef<{
    active: boolean;
    inCombat: boolean;
    snapshot:
      | { regionId: string; pack: Record<string, number>; packGp: number; cleared: number; bySellsword: boolean }
      | undefined;
  }>({ active: false, inCombat: false, snapshot: undefined });
  useEffect(() => {
    const prev = prevRef.current;
    const now = {
      active: exp !== undefined,
      inCombat: exp?.combat != null,
      // Stamp WHO owns the dive: the sellsword autopilot shares this same
      // expedition slot (it runs inside tickWorld), so without this its dives
      // would fire player death toasts + pollute the Delve Log.
      snapshot: exp
        ? {
            regionId: exp.regionId,
            pack: { ...exp.pack },
            packGp: exp.packGp,
            cleared: exp.cleared,
            bySellsword: !!agent?.sellsword,
          }
        : prev.snapshot,
    };
    if (prev.active && !now.active && prev.snapshot && !prev.snapshot.bySellsword) {
      // A PLAYER expedition ended (sellsword dives are skipped — they report via
      // the sellsword stats + away-bar summary). Vanishing mid-combat = death;
      // otherwise a clean extract. Both get a Delve Log entry; death also toasts.
      const died = prev.inCombat;
      onDelveEnd?.(summarizeDelve(prev.snapshot, died, game.world.tick));
      if (died) {
        const r = deathRecap(game.world.items, prev.snapshot.pack, prev.snapshot.packGp);
        const where = REGIONS[regionIndex(prev.snapshot.regionId)]?.name ?? 'the depths';
        const keptLine = r.kept.length > 0 ? `kept: ${r.kept.join(', ')}` : 'you carried nothing worth keeping';
        const lostLine =
          r.lostUnits > 0 || r.lostGp > 0
            ? ` — the dark kept ${r.lostUnits} item${r.lostUnits === 1 ? '' : 's'} and ${r.lostGp.toLocaleString('en-US')} loot gp`
            : '';
        onToast(`You died in ${where}`, `${keptLine}${lostLine}`);
      }
    }
    prevRef.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exp !== undefined, exp?.combat != null, exp?.packGp, JSON.stringify(exp?.pack ?? null)]);

  const names = new Map(game.world.items.map((i) => [i.id, i.name]));

  if (!exp) {
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
          onRest={onRest}
        />
        <GearManager agent={agent} items={game.world.items} onCommand={onCommand} view={view} onBuy={onBuy} />
        {resting && (
          <p className="warn small" title="wounds persist between expeditions — rest (or embark hurt, your gamble)">
            ♥ recovering: {agent!.hp}/{trainedMax} hp — mending as the market ticks
          </p>
        )}
        {(view.upgrades['sellsword'] ?? 0) > 0 && (
          <p className="dim small">
            🗡 sellsword: {agent?.sellsword ? 'hunting the shallows while you trade' : 'resting at the inn'}
            {((st.sellswordKills ?? 0) > 0 || (st.sellswordBanked ?? 0) > 0) &&
              ` · ${(st.sellswordKills ?? 0).toLocaleString('en-US')} kills · ${(st.sellswordBanked ?? 0).toLocaleString(
                'en-US',
              )} gp banked`}{' '}
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
                      <MonsterGlyph monsterId={m.id} size={22} />{' '}
                      {m.name}
                      {m.dragonfire ? ' 🔥' : ''}
                    </span>
                    <span className="dim small">
                      ⚔{m.atk} 🛡{m.def} · {m.hp} hp{m.leech ? ` · 💧${m.leech}/rd` : ''} · {m.gp[0]}–{m.gp[1]} gp
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
      </section>
    );
  }

  const region = REGIONS[regionIndex(exp.regionId)]!;
  const stats = deriveStats(exp.pack, lvls, agent?.worn); // worn overrides the pack — mirror the engine's combat
  // Which equipment slots the fighter actually has usable gear in — drives the
  // combat-scene figure, mirroring the paperdoll's per-slot logic.
  const fighterKit = { weapon: false, helm: false, body: false, legs: false, shield: false };
  for (const [id, q] of Object.entries(exp.pack)) {
    if (q < 1) continue;
    const g = GEAR[id];
    if (!g) continue;
    if ((g.slot === 'weapon' ? lvls.atk : lvls.def) < g.req) continue; // inert — doesn't show
    fighterKit[g.slot] = true;
  }
  const hpPct = Math.min(100, Math.round(((exp.combat ? exp.combat.playerHp : exp.hp) / trainedMax) * 100));
  const foods = Object.entries(exp.pack).filter(([id, qty]) => qty > 0 && CONSUMABLES[id] !== undefined);

  return (
    <section className="panel expedition">
      <h2>Expeditions · {region.name}</h2>
      {agent?.sellsword && (
        // The hunt is on + the slot is occupied → this dive is the sellsword's
        // (it shares agent.expedition). Make that unmistakable so the player
        // doesn't mistake it for their own or fight its rounds by accident.
        <p className="warn small" title="your hireling runs this dive on its own — call it back from the toggle below to take the reins yourself">
          🗡 your sellsword is on this dive — it fights on its own
        </p>
      )}
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
            // Your effective combat stats this fight (gear + dive brew) — drives
            // both the know-your-enemy readout and the live forecast below.
            const youAtk = stats.atk + (exp.boost?.atk ?? 0);
            const youDef = stats.def + (exp.boost?.def ?? 0);
            return (
              <>
                <CombatScene
                  monsterId={exp.combat!.monsterId}
                  monsterHp={exp.combat!.monsterHp}
                  playerHp={exp.combat!.playerHp}
                  playerMaxHp={exp.combat!.maxHp ?? trainedMax}
                  logLen={exp.combat!.log.length}
                  kit={fighterKit}
                  regionId={exp.regionId}
                />
                <p className="small">
                  <b>{m.name}</b> — {Math.max(0, exp.combat!.monsterHp)}/{m.hp} hp · you{' '}
                  {Math.max(0, exp.combat!.playerHp)}/{exp.combat!.maxHp ?? trainedMax}{' '}
                  <span className="dim" title="the foe's attack vs your defence, and its defence vs your attack — red means it out-matches you on that axis (same lens as the region danger read)">
                    · ⚔<b className={m.atk > youDef ? 'down' : 'up'}>{m.atk}</b> 🛡
                    <b className={m.def > youAtk ? 'down' : 'up'}>{m.def}</b>
                    {m.dragonfire ? (exp.combat!.antifire ? ' 🛡🔥' : ' 🔥') : ''}
                  </span>
                  {m.leech ? (
                    <span
                      className="pct down"
                      title="this foe bleeds loot gp from your pack EVERY round the fight drags — it's a gp-race, not just an hp-race. Finish fast, or extract before it eats your haul."
                    >
                      {' '}
                      💧−{m.leech.toLocaleString('en-US')} gp/round
                    </span>
                  ) : null}
                </p>
                {(() => {
                  // Live read at the CURRENT hp — should I push or flee? Counts
                  // dragonfire (+ceil(atk/2)/round when no antifire) so it doesn't
                  // lie in a dragon fight. Estimate (rolls vary); leech drains loot
                  // not hp, so it's irrelevant to the survival race.
                  const dragonBonus = m.dragonfire && !exp.combat!.antifire ? Math.ceil(m.atk / 2) : 0;
                  const f = combatForecast(
                    { atk: youAtk, def: youDef, hp: exp.combat!.playerHp },
                    { atk: m.atk, def: m.def, hp: exp.combat!.monsterHp },
                    dragonBonus,
                  );
                  return (
                    <p className="dim small forecast" title="live read at the current hp — expected rounds either way (an estimate; rolls vary). dragonfire is counted when no antifire holds.">
                      ≈<b>{f.roundsToKill}</b> hit{f.roundsToKill === 1 ? '' : 's'} to finish it · it downs you in ≈
                      <b>{f.roundsToFall}</b> · <b className={f.favored ? 'up' : 'down'}>{f.favored ? 'winning the race' : 'flee?'}</b>
                    </p>
                  );
                })()}
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
              {{ shrine: 'pay the tithe', gamble: 'roll the dice', portal: 'step through', imp: 'chase it', merchant: 'pay up', spar: 'take the lesson', toll: 'pay the toll', courier: 'ship it home', forge: 'whet the blade', altar: 'spill blood' }[
                exp.event.kind
              ] ?? 'accept'}
            </button>
            <button className="chip" onClick={() => onCommand({ type: 'choose', accept: false })}>
              walk on
            </button>
          </div>
        </>
      ) : (
        <>
          {(() => {
            // Push-your-luck risk read at your CURRENT hp (wounds carry between
            // fights): vs the HARDEST foe this region can throw, would advancing
            // be a fair fight or a gamble? Pairs with the extract button's loot
            // stake — together they frame "bank it or push?". Honest estimate.
            const d = regionDanger(region);
            const roster = region.elite ? [...region.monsters, region.elite] : region.monsters;
            const fiery = roster.some((id) => monsterById(id).dragonfire);
            const dragonBonus = fiery && !exp.antifire ? Math.ceil(d.atk / 2) : 0;
            const f = combatForecast({ atk: stats.atk, def: stats.def, hp: exp.hp }, { atk: d.atk, def: d.def, hp: d.hp }, dragonBonus);
            // The packed food is a survival cushion: re-read at hp + remaining heal to
            // see how many extra rounds it buys. The displayed verdict stays at RAW hp
            // (food shouldn't silently flip "risky"→"favored"), but a well-stocked diver
            // sees the margin — and we drop the "bank?" nag when food would win the race.
            const packHeal = healFromPack(exp.pack);
            const ff =
              packHeal > 0
                ? combatForecast({ atk: stats.atk, def: stats.def, hp: exp.hp + packHeal }, { atk: d.atk, def: d.def, hp: d.hp }, dragonBonus)
                : f;
            const foodRounds = ff.roundsToFall - f.roundsToFall;
            return (
              <p
                className="dim small forecast"
                title="a rough read on the HARDEST foe this region can send, at your CURRENT hp — push deeper, or bank what you've got? The next encounter is random and rolls vary; this is an estimate, not a promise."
              >
                push read: you down it in ≈<b>{f.roundsToKill}</b> · it downs you in ≈<b>{f.roundsToFall}</b> ·{' '}
                <b className={f.favored ? 'up' : 'down'}>{f.favored ? 'favored' : 'risky'}</b>
                {foodRounds > 0 ? (
                  <span className="up" title="extra rounds your PACKED food buys if you eat to stay up — optimistic (ignores overheal), like the forecast itself">
                    {' '}· 🍖 food +≈{foodRounds}
                  </span>
                ) : null}
                {!f.favored && !ff.favored && exp.packGp > 0 ? ' — bank your haul?' : ''}
              </p>
            );
          })()}
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
            className={`chip extract${exp.packGp > 0 ? ' hasloot' : ''}`}
            title="leaving banks your loot and returns your packed kit safely — push deeper for more, but a death down here loses the whole haul"
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
            {exp.packGp > 0 ? `extract · bank ${exp.packGp.toLocaleString('en-US')} gp` : 'extract (keep your kit)'}
          </button>
          </div>
        </>
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
