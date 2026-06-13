import { CONSUMABLES, deriveStats, GEAR, levelsOf, maxHpFor, monsterById, REGIONS, REST_REGEN_TICKS, regionIndex } from '@exchange-wars/engine';
import type { ItemDef, PlayerCommand, PlayerView } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import { combatForecast, embarkPrep, healEta, loadoutShort, regionLoot, type Game } from '../game';
import { usePref } from '../usePref';
import { arenaTheme } from './CombatScene';
import { ItemIcon } from './Icon';
import { RegionMap } from './RegionMap';
import { regionDanger, diveReadiness } from './ExpeditionPanel';

/**
 * The "plan a dive" flow (Jesse asked to move it off the tall left column to the
 * empty right side): pick a region, read its danger/forecast vs your kit, pack a
 * loadout, embark. Owns the region/draft/loadout state. Renders nothing while
 * you're already on a dive — you can't embark from the field.
 */
export function EmbarkPanel({
  game,
  view,
  items,
  onCommand,
  onRest,
  regionPick,
  active,
}: {
  game: Game;
  view: PlayerView;
  items: ItemDef[];
  onCommand: (cmd: PlayerCommand) => void;
  /** Fast-forward N ticks (the rest-to-full action) — heal before diving wounded. */
  onRest?: ((ticks: number) => void) | undefined;
  /** A nonce-pulsed request (from a Delve Log row) to pre-select a region. */
  regionPick?: { regionId: string; n: number } | null;
  /** True when the Adventure tab is the active room — gates the keyboard nav. */
  active?: boolean;
}) {
  const agent = game.world.agents[game.playerId];
  const progress = agent?.questProgress ?? 0;
  const lvls = levelsOf(agent?.combatXp);
  const trainedMax = maxHpFor(lvls.hp);
  const [regionId, setRegionId] = useState(REGIONS[0]!.id);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [loadouts, setLoadouts] = usePref<Record<string, number>[]>('ew-loadouts', []);
  const names = new Map(items.map((i) => [i.id, i.name]));
  const wikiOf = new Map(items.map((i) => [i.id, i.wikiId]));

  // Apply a "raid here again" pulse from a Delve Log row — nonce-guarded so the
  // same region can be re-picked, and so it only fires on a fresh request.
  const appliedPick = useRef(0);
  useEffect(() => {
    if (regionPick && regionPick.n !== appliedPick.current) {
      appliedPick.current = regionPick.n;
      setRegionId(regionPick.regionId);
    }
  }, [regionPick]);

  // Embark on the current region with the packed draft — the ONE embark path, shared by
  // the EMBARK button and the Enter key so they can never diverge. Guarded by the same
  // locked check (can't dive a region above your progress).
  const doEmbark = (): void => {
    if (regionIndex(regionId) > progress) return;
    const pack: Record<string, number> = {};
    for (const [id, qty] of Object.entries(draft)) if (qty > 0) pack[id] = qty;
    onCommand({ type: 'startExpedition', regionId, pack });
    setDraft({});
  };

  // Keyboard nav (14w): ←/→ move the selected region among the unlocked ones, Enter embarks.
  // Active only on the Adventure tab and out of a dive; never hijacks typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!active || agent?.expedition) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const cur = regionIndex(regionId);
        const next = e.key === 'ArrowLeft' ? Math.max(0, cur - 1) : Math.min(progress, cur + 1);
        setRegionId(REGIONS[next]!.id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        doEmbark();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, agent?.expedition, regionId, progress, draft, onCommand]);

  // No embarking while you're out — the field shows in the Expeditions panel.
  if (agent?.expedition) return null;

  // Dive readiness (16x), computed once per render BELOW the early return so it's free while diving
  // (17i): the deepest region you're favored to farm. Drives both the text readout and the RegionMap
  // "dive here" ring (17g). Pure consts (not hooks), used only in the JSX — safe below the return.
  const eff = deriveStats(view.inventory, lvls, agent?.worn);
  const readiness = diveReadiness({ atk: eff.atk, def: eff.def, hp: trainedMax }, progress);
  const idx = regionIndex(regionId);
  const locked = idx > progress;
  const bump = (id: string, delta: number, max: number): void =>
    setDraft((d) => {
      const next = Math.max(0, Math.min(max, (d[id] ?? 0) + delta));
      return { ...d, [id]: next };
    });
  const relevant = Object.entries(view.inventory)
    .filter(([id, qty]) => qty > 0 && (GEAR[id] !== undefined || CONSUMABLES[id] !== undefined))
    .sort(([a], [b]) => (a < b ? -1 : 1));

  return (
    <section className="panel embark">
      <h2>Plan a Dive</h2>
      <RegionMap progress={progress} selected={regionId} onSelect={setRegionId} recommended={readiness.ready} />
      {/* region-tinted readout (14u palette, completing combat→map→embark): a faint
          gradient backdrop so the whole "what you're getting into" block FEELS like
          the region you're about to enter. Kept low-alpha so the reads stay legible. */}
      <div
        className="region-readout"
        style={{ background: `linear-gradient(155deg, ${arenaTheme(regionId).from}33, ${arenaTheme(regionId).to}11)` }}
      >
      <p className="dim small">{REGIONS[regionIndex(regionId)]?.flavor}</p>
      {(() => {
        // Dive readiness (16x): the deepest region you're favored to FARM (vs its typical foe, full hp) —
        // a global "where should I dive?" read, since unlocking a region (clear the one before) doesn't mean
        // you can survive it. Complements the per-region forecast below (which reads the SELECTED region's
        // HARDEST foe). Computed once at panel scope; the RegionMap rings `r.ready` as "dive here" (17g).
        const r = readiness;
        const title = 'how deep you can reliably farm — favored against a region’s USUAL foe at full hp (the per-region read below covers the worst case)';
        if (r.ready >= r.frontier) {
          return (
            <p className="dim small ready" title={title}>
              <b className="up">✓ ready</b> — favored across every region you’ve unlocked
              {r.frontier < REGIONS.length - 1 ? <> · clear <b>{REGIONS[r.frontier]!.name}</b> to open the next</> : <> · the deepest reaches are yours</>}
            </p>
          );
        }
        if (r.ready >= 0) {
          return (
            <p className="dim small ready" title={title}>
              📍 your safe depth is <b className="up">{REGIONS[r.ready]!.name}</b> — <b className="down">{REGIONS[r.ready + 1]!.name}</b> and deeper still outmatch you; train up to push on
            </p>
          );
        }
        return (
          <p className="dim small ready" title={title}>
            <b className="down">⚠ outmatched</b> — even {REGIONS[0]!.name}’s usual foe out-trades you; pack food and fight cautiously
          </p>
        );
      })()}
      {(() => {
        const d = regionDanger(REGIONS[regionIndex(regionId)]!);
        const eff = deriveStats(view.inventory, lvls, agent?.worn);
        const atkBad = d.atk > eff.def;
        const defBad = d.def >= eff.atk;
        return (
          <p
            className="dim small"
            title={`the hardest foe here vs your in-battle ⚔${eff.atk} 🛡${eff.def} — red means this foe stat beats yours (⚔ red: they hit through your defence; 🛡 red: your attack barely lands)`}
          >
            danger: foes up to <b className={atkBad ? 'down' : 'up'}>⚔{d.atk}</b>{' '}
            <b className={defBad ? 'down' : 'up'}>🛡{d.def}</b> · {d.hp} hp
            {d.elite ? ' · ☠ a named terror lurks here' : ''}
            {d.leech > 0 ? (
              <span className="pct down" title="foes here bleed loot gp from your pack every round a fight drags — a gp-race; bring damage and plan to extract">
                {' '}· 💧 drains loot
              </span>
            ) : null}
          </p>
        );
      })()}
      {(() => {
        // The REWARD side of the decision (complements the danger line above): the
        // region's gp/kill range and its notable drops, so "worth the risk?" weighs
        // payoff, not just survival. Roster ids are engine-internal → monsterById safe.
        const region = REGIONS[regionIndex(regionId)]!;
        const roster = (region.elite ? [...region.monsters, region.elite] : region.monsters).map(monsterById);
        const loot = regionLoot(roster);
        const TOP = 4;
        return (
          <p className="dim small" title="the reward side: gp each kill carries here, and the items this region's foes can drop (each shown at its best chance) — weigh it against the danger above">
            loot: ≈<b className="up">{loot.gpLo.toLocaleString('en-US')}–{loot.gpHi.toLocaleString('en-US')}</b> gp/kill
            {loot.drops.length > 0 && (
              <>
                {' · drops '}
                {loot.drops.slice(0, TOP).map((dr, i) => (
                  <span key={dr.itemId} className="dropchip" title={`${Math.round(dr.chance * 100)}% from a kill`}>
                    {i > 0 ? ' ' : ''}
                    <ItemIcon id={dr.itemId} wikiId={wikiOf.get(dr.itemId)} size={12} className="itemicon" />{' '}
                    {(names.get(dr.itemId) ?? dr.itemId).toLowerCase()}
                  </span>
                ))}
                {loot.drops.length > TOP && <span className="dim"> +{loot.drops.length - TOP} more</span>}
              </>
            )}
          </p>
        );
      })()}
      {(() => {
        const region = REGIONS[regionIndex(regionId)]!;
        const d = regionDanger(region);
        const eff = deriveStats(view.inventory, lvls, agent?.worn);
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
        const ownedFix = (pred: (id: string) => boolean): string | undefined =>
          Object.keys(view.inventory)
            .sort()
            .find((id) => (view.inventory[id] ?? 0) > 0 && CONSUMABLES[id] !== undefined && pred(id));
        const fixFor = (kind: 'antifire' | 'food'): string | undefined =>
          kind === 'antifire' ? ownedFix((id) => !!CONSUMABLES[id]?.antifire) : ownedFix((id) => (CONSUMABLES[id]?.heal ?? 0) > 0);
        const fixes = [...new Set(warnings.map((w) => fixFor(w.kind)).filter((x): x is string => !!x))];
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
                    <button className="chip" title={`pack one ${(names.get(fix) ?? fix).toLowerCase()} from your bank`} onClick={() => bump(fix, 1, view.inventory[fix] ?? 1)}>
                      {' '}+ pack {(names.get(fix) ?? fix).toLowerCase()}
                    </button>
                  )}
                </p>
              );
            })}
            {fixes.length >= 2 && (
              <p className="warn small">
                <button
                  className="chip"
                  title="pack one of each item that clears the warnings above — fixes the whole loadout in one tap"
                  onClick={() =>
                    setDraft((d) => {
                      const next = { ...d };
                      for (const fix of fixes) next[fix] = Math.min((next[fix] ?? 0) + 1, view.inventory[fix] ?? 1);
                      return next;
                    })
                  }
                >
                  ⚑ prep me
                </button>
              </p>
            )}
          </>
        );
      })()}
      {(() => {
        // Wounded nudge: the forecast above is computed at FULL hp, but you can embark
        // straight out of a prior dive before regen finishes (the engine deletes `hp`
        // only at full, so a defined hp here = wounded). Warn + offer the rest-to-full.
        const hp = agent?.hp;
        if (hp === undefined || hp >= trainedMax) return null;
        const eta = healEta(hp, trainedMax, REST_REGEN_TICKS);
        return (
          <p className="warn small">
            ⚠ you're at {hp}/{trainedMax} hp — you'll dive hurt (the forecast assumes full hp).
            {onRest && eta !== null && (
              <button
                className="chip"
                title={`fast-forward ≈${eta.toLocaleString('en-US')} ticks to heal to full before you embark`}
                onClick={() => onRest(eta)}
              >
                {' '}
                rest to full (≈{eta.toLocaleString('en-US')} ticks)
              </button>
            )}
          </p>
        );
      })()}
      </div>
      <h3>Pack &amp; Equip</h3>
      <p className="dim small">
        There's no separate equip slot — <b>gear you pack is worn automatically</b> (the best usable item per slot
        fights for you). Tap <b>equip best</b> to auto-pack your strongest kit, or add items by hand below. Gear above
        your level (🔒) is inert until you train.{' '}
        <button
          className="chip"
          title="auto-pack the best usable weapon + armor you own (best per slot)"
          onClick={() => {
            const best: Record<string, { id: string; score: number }> = {};
            for (const [id, qty] of Object.entries(view.inventory)) {
              if (qty < 1) continue;
              const g = GEAR[id];
              if (!g) continue;
              if ((g.slot === 'weapon' ? lvls.atk : lvls.def) < g.req) continue;
              const score = g.atk + g.def;
              if (!best[g.slot] || score > best[g.slot]!.score) best[g.slot] = { id, score };
            }
            setDraft((d) => {
              const next: Record<string, number> = {};
              for (const [id, q] of Object.entries(d)) if (!GEAR[id]) next[id] = q;
              for (const v of Object.values(best)) next[v.id] = 1;
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
            const held = view.inventory[id] ?? 0;
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
        const removeLoadout = (i: number): void => setLoadouts(loadouts.filter((_, j) => j !== i));
        if (loadouts.length === 0 && draftUnits === 0) return null;
        return (
          <p className="dim small loadouts">
            loadouts:{' '}
            {loadouts.map((lo, i) => {
              // Surface what `applyLoadout`'s clamp would silently take: if you no longer hold enough
              // of an item, mark the chip ⚠ + name the shortfall, so a reduced refill is informed (18c).
              const short = loadoutShort(lo, view.inventory);
              const title =
                short.length > 0
                  ? `⚠ understocked: ${short
                      .map((s) => `${(names.get(s.itemId) ?? s.itemId).toLowerCase()} ${s.have}/${s.want}`)
                      .join(', ')} — applies what you hold`
                  : 'fill the pack from this saved kit (clamped to what you hold)';
              return (
                <span key={i}>
                  <button className={short.length > 0 ? 'chip short' : 'chip'} title={title} onClick={() => applyLoadout(lo)}>
                    {label(lo)}
                    {short.length > 0 ? ' ⚠' : ''}
                  </button>
                  <button className="chip" title="forget this loadout" onClick={() => removeLoadout(i)}>
                    ×
                  </button>{' '}
                </span>
              );
            })}
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
                <ItemIcon id={id} wikiId={wikiOf.get(id)} size={14} className="itemicon" /> {names.get(id) ?? id}
              </span>
              <span className="dim small">
                {g
                  ? `atk ${g.atk} def ${g.def} · req ${g.slot === 'weapon' ? '⚔' : '🛡'}${g.req}${inert ? ' 🔒' : ''}`
                  : CONSUMABLES[id]!.boostAtk || CONSUMABLES[id]!.boostDef
                    ? `⚗ brew ${CONSUMABLES[id]!.boostAtk ? `+${CONSUMABLES[id]!.boostAtk} atk ` : ''}${CONSUMABLES[id]!.boostDef ? `+${CONSUMABLES[id]!.boostDef} def` : ''} (whole dive)`
                    : `heals ${CONSUMABLES[id]!.heal}`}
              </span>
              <span className="num">
                {/* a11y: symbol-only steppers need an accessible name — "−"/"+" alone read as nothing useful (18v). */}
                <button className="chip" aria-label={`pack one fewer ${names.get(id) ?? id}`} onClick={() => bump(id, -1, held)}>−</button> {draft[id] ?? 0}/{held}{' '}
                <button className="chip" aria-label={`pack one more ${names.get(id) ?? id}`} onClick={() => bump(id, 1, held)}>+</button>
              </span>
            </li>
          );
        })}
      </ul>
      <button className="submit buy" disabled={locked} onClick={doEmbark} title="or press Enter">
        embark{locked ? ' (locked)' : ''}
      </button>
    </section>
  );
}
