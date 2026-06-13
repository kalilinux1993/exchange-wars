import { combatLevel, deriveStats, GEAR, levelsOf, maxHpFor, REST_REGEN_TICKS, xpForLevel } from '@exchange-wars/engine';
import type { GearSlot } from '@exchange-wars/engine';
import type { AgentState } from '@exchange-wars/engine';
import { useEffect, useRef, useState } from 'react';
import { healEta, leveledUp } from '../game';
import { Icon, ItemIcon } from './Icon';

const TITLE_KEY = 'ew-title';

const SLOTS: { slot: GearSlot; label: string; x: number; y: number }[] = [
  { slot: 'helm', label: 'helm', x: 50, y: 16 },
  { slot: 'body', label: 'body', x: 50, y: 44 },
  { slot: 'weapon', label: 'weapon', x: 20, y: 44 },
  { slot: 'shield', label: 'shield', x: 80, y: 44 },
  { slot: 'legs', label: 'legs', x: 50, y: 74 },
];

/** What the player ACTUALLY fights in per slot (mirrors deriveStats): the best
 * usable piece they hold, but anything they've persistently EQUIPPED (`worn`)
 * overrides the inventory pick for that slot — so the paperdoll matches the
 * equipment manager and the combat math, even after gear leaves the satchel. */
export function equipped(
  inv: Record<string, number>,
  lvls: { atk: number; def: number },
  worn?: Record<string, string>,
): Partial<Record<GearSlot, string>> {
  const best: Partial<Record<GearSlot, { id: string; score: number }>> = {};
  for (const [id, qty] of Object.entries(inv)) {
    if (qty < 1) continue;
    const g = GEAR[id];
    if (!g) continue;
    if ((g.slot === 'weapon' ? lvls.atk : lvls.def) < g.req) continue;
    const score = g.atk + g.def;
    const cur = best[g.slot];
    // Tie-break by SMALLER itemId — the same order-independent rule equipBest
    // uses, so the paperdoll preview names exactly what "equip best" would wear.
    if (!cur || score > cur.score || (score === cur.score && id < cur.id)) best[g.slot] = { id, score };
  }
  const out: Partial<Record<GearSlot, string>> = {};
  for (const [slot, v] of Object.entries(best)) out[slot as GearSlot] = v!.id;
  // Equipped gear OVERRIDES the inventory pick per slot — identical rule to
  // deriveStats, so the figure shows what truly fights, not what you could pack.
  if (worn) {
    for (const id of Object.values(worn)) {
      const g = GEAR[id];
      if (!g) continue;
      if ((g.slot === 'weapon' ? lvls.atk : lvls.def) < g.req) continue;
      out[g.slot] = id;
    }
  }
  return out;
}

export interface LockedPick {
  id: string;
  req: number;
  skill: 'atk' | 'def';
}

/**
 * The best gear the player HOLDS but can't equip yet (level-gated), per slot —
 * the "train to unlock this" hint that makes the stats/xp ladder legible. Only
 * items that would actually BEAT the currently-worn piece qualify (an unusable
 * downgrade isn't an aspiration). `worn` is the result of `equipped()`.
 */
export function lockedUpgrades(
  inv: Record<string, number>,
  lvls: { atk: number; def: number },
  worn: Partial<Record<GearSlot, string>>,
): Partial<Record<GearSlot, LockedPick>> {
  const wornScore = (slot: GearSlot): number => {
    const id = worn[slot];
    const g = id ? GEAR[id] : undefined;
    return g ? g.atk + g.def : -1;
  };
  const best: Partial<Record<GearSlot, LockedPick & { score: number }>> = {};
  for (const [id, qty] of Object.entries(inv)) {
    if (qty < 1) continue;
    const g = GEAR[id];
    if (!g) continue;
    const skill: 'atk' | 'def' = g.slot === 'weapon' ? 'atk' : 'def';
    if (lvls[skill] >= g.req) continue; // already usable → not a locked hint
    const score = g.atk + g.def;
    if (score <= wornScore(g.slot)) continue; // not an upgrade over what's worn
    if (!best[g.slot] || score > best[g.slot]!.score) best[g.slot] = { id, req: g.req, skill, score };
  }
  const out: Partial<Record<GearSlot, LockedPick>> = {};
  for (const [slot, v] of Object.entries(best)) out[slot as GearSlot] = { id: v!.id, req: v!.req, skill: v!.skill };
  return out;
}

/**
 * The character sheet (9k): an OSRS-flavored paperdoll + a skills strip.
 * The figure's armor plates light up for each equipped slot; the skills
 * show Attack/Defence/Hitpoints with level and xp-to-next. Pure display.
 */
export function CharacterPanel({
  agent,
  names,
  wikiOf,
  titles = [],
  onRest,
}: {
  agent: AgentState | undefined;
  names: Map<string, string>;
  /** id → wikiId, so equipped gear shows its ACTUAL item icon (absent → the category glyph). */
  wikiOf?: Map<string, number | undefined> | undefined;
  /** Display names of earned deeds, offered as selectable titles. */
  titles?: string[];
  /** Fast-forward N ticks to mend — wired to the "rest to full" button. */
  onRest?: ((ticks: number) => void) | undefined;
}) {
  const lvls = levelsOf(agent?.combatXp);
  const trainedMax = maxHpFor(lvls.hp);
  // Flash the skill cell the instant it levels (OSRS-style) — the visual
  // confirmation that pairs with App's level-up toast. Lazy-init so opening the
  // sheet on an already-leveled character doesn't flash. Combat (xp gain) runs
  // on this tab, so the flash fires right where the player is watching.
  const prevLvls = useRef<{ atk: number; def: number; hp: number } | null>(null);
  const prevAgent = useRef<AgentState | undefined>(undefined);
  const [flash, setFlash] = useState<Record<'atk' | 'def' | 'hp', boolean>>({ atk: false, def: false, hp: false });
  useEffect(() => {
    // (Re)baseline on first render OR an agent swap (game load/restart) — a new
    // character must not flash its inherited levels. Within one game the agent
    // is mutated in place, so the ref is stable and real level-ups still flash.
    if (prevLvls.current === null || prevAgent.current !== agent) {
      prevLvls.current = lvls;
      prevAgent.current = agent;
      return;
    }
    const rose = leveledUp(prevLvls.current, lvls);
    prevLvls.current = lvls;
    if (rose.length === 0) return;
    setFlash((f) => ({ ...f, ...Object.fromEntries(rose.map((u) => [u.skill, true])) }));
    const t = setTimeout(() => setFlash({ atk: false, def: false, hp: false }), 1200);
    return () => clearTimeout(t);
  }, [lvls.atk, lvls.def, lvls.hp]);
  const kit = equipped(agent?.inventory ?? {}, lvls, agent?.worn);
  const eff = deriveStats(agent?.inventory ?? {}, lvls, agent?.worn);
  const locked = lockedUpgrades(agent?.inventory ?? {}, lvls, kit);
  const hp = agent?.hp ?? trainedMax;
  // Wounds only mend out of the field (+1 hp / REST_REGEN_TICKS) — so the rest
  // ETA shows only when wounded AND not on a dive: fast-forward this to heal.
  const restEta = agent?.hp !== undefined && !agent?.expedition ? healEta(hp, trainedMax, REST_REGEN_TICKS) : null;
  const cmb = combatLevel(agent?.combatXp);
  const [title, setTitle] = useState<string>(() => {
    try {
      return localStorage.getItem(TITLE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  // A title sticks only while still earned (deeds never un-latch, so this is
  // really just guarding a hand-edited localStorage).
  const shownTitle = title && titles.includes(title) ? title : 'Adventurer';
  const pickTitle = (t: string): void => {
    setTitle(t);
    try {
      localStorage.setItem(TITLE_KEY, t);
    } catch {
      /* private mode — title is cosmetic */
    }
  };
  const skill = (key: 'atk' | 'def' | 'hp', glyph: string, name: string) => {
    const lvl = lvls[key];
    const cur = agent?.combatXp?.[key] ?? 0;
    const maxed = lvl >= 99;
    const into = maxed ? 1 : (cur - xpForLevel(lvl)) / (xpForLevel(lvl + 1) - xpForLevel(lvl));
    // Quantify the bar (18j): it showed SOME progress but no value — surface the % and the actual xp to the
    // next level (which gates the next gear tier), so "how close am I?" is readable, not eyeballed.
    const progress = maxed
      ? 'maxed (99)'
      : `${Math.round(into * 100)}% to ${lvl + 1} · ${(xpForLevel(lvl + 1) - cur).toLocaleString('en-US')} xp to go`;
    return (
      <div className={flash[key] ? 'skillcell flash' : 'skillcell'} title={`${name} ${lvl} · ${progress}`}>
        <Icon name={`skill-${name.toLowerCase()}`} glyph={glyph} size={14} className="skillglyph" />
        <span className="skilllvl">{lvl}</span>
        <span className="skillbar" title={progress}>
          <span style={{ width: `${Math.round(into * 100)}%` }} />
        </span>
      </div>
    );
  };
  return (
    <div className="character">
      <svg className="paperdoll" viewBox="0 0 100 96" role="img" aria-label="your adventurer">
        {/* body silhouette */}
        <ellipse cx={50} cy={10} rx={7} ry={8} className="doll-skin" />
        <rect x={40} y={20} width={20} height={26} rx={3} className={`doll-slot body${kit.body ? ' on' : ''}`} />
        <rect x={43} y={46} width={6} height={24} rx={2} className={`doll-slot legs${kit.legs ? ' on' : ''}`} />
        <rect x={51} y={46} width={6} height={24} rx={2} className={`doll-slot legs${kit.legs ? ' on' : ''}`} />
        <rect x={42} y={4} width={16} height={9} rx={3} className={`doll-slot helm${kit.helm ? ' on' : ''}`} />
        <rect x={26} y={26} width={8} height={22} rx={2} className={`doll-slot weapon${kit.weapon ? ' on' : ''}`} />
        <rect x={66} y={26} width={9} height={16} rx={2} className={`doll-slot shield${kit.shield ? ' on' : ''}`} />
      </svg>
      <div className="charside">
        <div className="charhead">
          <span className="cmblvl" title="combat level — grows with all three skills">⚔ Combat Lv {cmb}</span>
          {titles.length > 0 ? (
            <select className="titlesel" value={shownTitle === 'Adventurer' ? '' : shownTitle} onChange={(e) => pickTitle(e.target.value)} title="wear a title you've earned">
              <option value="">Adventurer</option>
              {titles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <span className="dim small">Adventurer</span>
          )}
        </div>
        <div className="equiplist">
          {SLOTS.map((s) => {
            const lock = locked[s.slot];
            return (
              <div key={s.slot} className={kit[s.slot] ? 'equip on' : 'equip'}>
                <span className="dim">{s.label}</span>
                <span className="equipval">
                  {kit[s.slot] ? (
                    <>
                      <ItemIcon id={kit[s.slot]!} wikiId={wikiOf?.get(kit[s.slot]!)} size={14} className="equipicon" />{' '}
                      {names.get(kit[s.slot]!) ?? kit[s.slot]}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                {lock && (
                  <span
                    className="lockhint"
                    title={`you're holding ${names.get(lock.id) ?? lock.id} — train ${
                      lock.skill === 'atk' ? 'Attack' : 'Defence'
                    } to ${lock.req} to wear it`}
                  >
                    🔒 {lock.skill === 'atk' ? 'Atk' : 'Def'} {lock.req}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="skills">
          {skill('atk', '⚔', 'Attack')}
          {skill('def', '🛡', 'Defence')}
          {skill('hp', '♥', 'Hitpoints')}
        </div>
        <p
          className="dim small effstats"
          title="your effective Attack/Defence including equipped gear — what actually fights; compare to a region's danger before you embark"
        >
          in battle:{' '}
          <b>
            ⚔{eff.atk} 🛡{eff.def}
          </b>
        </p>
        <div className="hpline">
          <span className="dim">hp</span>
          <span className="hpbar mini">
            <span className="hpfill" style={{ width: `${Math.min(100, Math.round((hp / trainedMax) * 100))}%` }} />
          </span>
          <span className="num">
            {hp}/{trainedMax}
          </span>
          {restEta !== null && (
            <span className="dim small resteta" title="wounds mend only out of the field — fast-forward this many ticks to reach full hp before your next dive">
              · ≈{restEta.toLocaleString('en-US')} ticks to heal
              {onRest && (
                <button
                  className="chip"
                  title="fast-forward exactly enough ticks to mend to full (the market moves too)"
                  onClick={() => onRest(restEta)}
                >
                  rest to full
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
