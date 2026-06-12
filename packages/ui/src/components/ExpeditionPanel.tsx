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
import { combatForecast, deathRecap, embarkPrep, MILESTONES, summarizeDelve, type DelveRecord, type Game } from '../game';
import { usePref } from '../usePref';
import { CharacterPanel } from './CharacterPanel';
import { CombatScene } from './CombatScene';
import { Icon, itemIcon } from './Icon';
import { MonsterGlyph } from './MonsterBody';
import { RegionMap } from './RegionMap';

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
} {
  const ids = region.elite ? [...region.monsters, region.elite] : region.monsters;
  let worst = { atk: 0, def: 0, hp: 0 };
  for (const id of ids) {
    const m = monsterById(id);
    if (m.atk + m.def > worst.atk + worst.def) worst = { atk: m.atk, def: m.def, hp: m.hp };
  }
  return { ...worst, elite: region.elite !== undefined };
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
  onToast,
  onDelveEnd,
  regionPick,
}: {
  game: Game;
  view: PlayerView;
  onCommand: (cmd: PlayerCommand) => void;
  onToast: (name: string, flavor: string) => void;
  /** Called once when an expedition ends (death or extract) with its Delve Log entry. */
  onDelveEnd?: (record: DelveRecord) => void;
  /** A nonce-pulsed request (from a Delve Log row) to pre-select a region. */
  regionPick?: { regionId: string; n: number } | null;
}) {
  const agent = game.world.agents[game.playerId];
  const exp = agent?.expedition;
  const progress = agent?.questProgress ?? 0;
  const lvls = levelsOf(agent?.combatXp);
  const trainedMax = maxHpFor(lvls.hp);
  const [regionId, setRegionId] = useState(REGIONS[0]!.id);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [loadouts, setLoadouts] = usePref<Record<string, number>[]>('ew-loadouts', []);

  // Apply a "raid here again" pulse from a Delve Log row — nonce-guarded so the
  // same region can be re-picked, and so it only fires on a fresh request.
  const appliedPick = useRef(0);
  useEffect(() => {
    if (regionPick && regionPick.n !== appliedPick.current) {
      appliedPick.current = regionPick.n;
      setRegionId(regionPick.regionId);
    }
  }, [regionPick]);

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
                      <MonsterGlyph monsterId={m.id} size={22} />{' '}
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
        {(() => {
          const d = regionDanger(REGIONS[regionIndex(regionId)]!);
          const eff = deriveStats(agent?.inventory ?? {}, lvls);
          const atkBad = d.atk > eff.def; // their hits land hard through your armour
          const defBad = d.def >= eff.atk; // your hits barely dent them
          return (
            <p
              className="dim small"
              title={`the hardest foe here vs your in-battle ⚔${eff.atk} 🛡${eff.def} — red means this foe stat beats yours (⚔ red: they hit through your defence; 🛡 red: your attack barely lands)`}
            >
              danger: foes up to <b className={atkBad ? 'down' : 'up'}>⚔{d.atk}</b>{' '}
              <b className={defBad ? 'down' : 'up'}>🛡{d.def}</b> · {d.hp} hp
              {d.elite ? ' · ☠ a named terror lurks here' : ''}
            </p>
          );
        })()}
        {(() => {
          const region = REGIONS[regionIndex(regionId)]!;
          const d = regionDanger(region);
          const eff = deriveStats(agent?.inventory ?? {}, lvls);
          const f = combatForecast({ atk: eff.atk, def: eff.def, hp: trainedMax }, { atk: d.atk, def: d.def, hp: d.hp });
          const roster = region.elite ? [...region.monsters, region.elite] : region.monsters;
          const fiery = roster.some((id) => monsterById(id).dragonfire);
          const packed = Object.entries(draft).filter(([id, q]) => q > 0 && CONSUMABLES[id] !== undefined);
          const warnings = embarkPrep({
            fiery,
            hasAntifire: packed.some(([id]) => CONSUMABLES[id]?.antifire),
            hasFood: packed.some(([id]) => (CONSUMABLES[id]?.heal ?? 0) > 0),
            riskyFight: !f.favored,
          });
          // The item that fixes each warning, if you OWN one (sorted id for a
          // stable pick) — packing it clears the warning on the next render.
          const ownedFix = (pred: (id: string) => boolean): string | undefined =>
            Object.keys(view.inventory)
              .sort()
              .find((id) => (view.inventory[id] ?? 0) > 0 && CONSUMABLES[id] !== undefined && pred(id));
          const fixFor = (kind: 'antifire' | 'food'): string | undefined =>
            kind === 'antifire'
              ? ownedFix((id) => !!CONSUMABLES[id]?.antifire)
              : ownedFix((id) => (CONSUMABLES[id]?.heal ?? 0) > 0);
          return (
            <>
              <p
                className="dim small"
                title="a rough exchange vs the hardest foe here, from expected damage both ways at full hp — you strike first, so a tie is a win. An estimate (rounds roll with variance), not a promise."
              >
                forecast: ≈<b>{f.roundsToKill}</b> round{f.roundsToKill === 1 ? '' : 's'} to down it · it downs you in ≈
                <b>{f.roundsToFall}</b> · <b className={f.favored ? 'up' : 'down'}>{f.favored ? 'favored' : 'risky'}</b>
              </p>
              {warnings.map((w) => {
                const fix = fixFor(w.kind);
                return (
                  <p key={w.kind} className="warn small">
                    {w.text}
                    {fix && (
                      <button
                        className="chip"
                        title={`pack one ${(names.get(fix) ?? fix).toLowerCase()} from your bank`}
                        onClick={() => bump(fix, 1, view.inventory[fix] ?? 1)}
                      >
                        {' '}+ pack {(names.get(fix) ?? fix).toLowerCase()}
                      </button>
                    )}
                  </p>
                );
              })}
            </>
          );
        })()}
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
            setLoadouts([pack, ...loadouts].slice(0, 4));
          };
          const removeLoadout = (idx: number): void => {
            setLoadouts(loadouts.filter((_, j) => j !== idx));
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
              <span>
                <Icon name={itemIcon(id).name} glyph={itemIcon(id).glyph} size={14} className="itemicon" /> {names.get(id) ?? id}
              </span>
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
                  kit={fighterKit}
                />
                <p className="small">
                  <b>{m.name}</b> — {Math.max(0, exp.combat!.monsterHp)}/{m.hp} hp · you{' '}
                  {Math.max(0, exp.combat!.playerHp)}/{exp.combat!.maxHp ?? trainedMax}
                </p>
                {(() => {
                  // Live read at the CURRENT hp — should I push or flee? Counts
                  // dragonfire (+ceil(atk/2)/round when no antifire) so it doesn't
                  // lie in a dragon fight. Estimate (rolls vary); leech drains loot
                  // not hp, so it's irrelevant to the survival race.
                  const youAtk = stats.atk + (exp.boost?.atk ?? 0);
                  const youDef = stats.def + (exp.boost?.def ?? 0);
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
