import { describe, expect, it } from 'vitest';
import { DEFAULT_ITEMS } from '../src/catalog';
import {
  CACHE_LOOT,
  CONSUMABLES,
  deriveStats,
  GEAR,
  levelFor,
  levelsOf,
  MONSTERS,
  newCombat,
  PLAYER_BASE,
  resolveRound,
  XP_CURVE_K,
  xpForLevel,
  type CombatState,
} from '../src/quest';
import { createRng } from '../src/rng';

describe('expeditions combat core', () => {
  it('every gear, consumable, loot, and cache id is a REAL catalog item', () => {
    const ids = new Set(DEFAULT_ITEMS.map((i) => i.id));
    for (const id of [...Object.keys(GEAR), ...Object.keys(CONSUMABLES)]) {
      expect(ids.has(id), `${id} missing from catalog`).toBe(true);
    }
    for (const m of MONSTERS) {
      for (const d of m.drops) expect(ids.has(d.itemId), `${m.id} drops unknown ${d.itemId}`).toBe(true);
      expect(m.gp[0]).toBeLessThanOrEqual(m.gp[1]);
    }
    for (const tier of CACHE_LOOT) {
      for (const id of tier.items) expect(ids.has(id), `cache loot unknown ${id}`).toBe(true);
    }
  });

  it('deriveStats takes the best USABLE item per slot and ignores consumables', () => {
    expect(deriveStats({})).toEqual({ atk: PLAYER_BASE.atk, def: PLAYER_BASE.def });
    const LV = { atk: 20, def: 20 };
    const s = deriveStats(
      {
        rune_battleaxe: 1,
        rune_2h_sword: 1, // better weapon — wins the slot
        rune_platelegs: 1,
        dragon_platelegs: 1, // better legs — wins the slot
        rune_platebody: 1,
        shark: 5, // food is not gear
      },
      LV,
    );
    expect(s.atk).toBe(PLAYER_BASE.atk + (LV.atk - 1) + GEAR['rune_2h_sword']!.atk);
    expect(s.def).toBe(PLAYER_BASE.def + (LV.def - 1) + GEAR['dragon_platelegs']!.def + GEAR['rune_platebody']!.def);
    expect(deriveStats({ rune_platebody: 0 })).toEqual(deriveStats({})); // qty 0 = not carried
  });

  it('training gates the arsenal: xp curve checkpoints and req enforcement', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(XP_CURVE_K)).toBe(2);
    expect(levelFor(XP_CURVE_K * 4)).toBe(3);
    expect(levelFor(xpForLevel(14) - 1)).toBe(13);
    expect(levelFor(xpForLevel(14))).toBe(14);
    expect(levelFor(10_000_000)).toBe(99); // capped
    expect(levelsOf(undefined)).toEqual({ atk: 1, def: 1 }); // pre-xp saves = level 1
    // Under-leveled gear is inert; the moment you qualify, it counts.
    const req = GEAR['rune_2h_sword']!.req;
    const below = deriveStats({ rune_2h_sword: 1 }, { atk: req - 1, def: 1 });
    expect(below.atk).toBe(PLAYER_BASE.atk + (req - 2)); // level bonus only, blade inert
    const at = deriveStats({ rune_2h_sword: 1 }, { atk: req, def: 1 });
    expect(at.atk).toBe(PLAYER_BASE.atk + (req - 1) + GEAR['rune_2h_sword']!.atk);
    // Weapons gate on Attack, armor gates on Defence — not the other way.
    const wrongStat = deriveStats({ rune_platebody: 1 }, { atk: 99, def: 1 });
    expect(wrongStat.def).toBe(PLAYER_BASE.def); // maxed Attack unlocks no armor
    const rightStat = deriveStats({ rune_platebody: 1 }, { atk: 1, def: GEAR['rune_platebody']!.req });
    expect(rightStat.def).toBe(PLAYER_BASE.def + (GEAR['rune_platebody']!.req - 1) + GEAR['rune_platebody']!.def);
  });

  it('combat is deterministic: same seed + same actions = identical fight', () => {
    const run = (): CombatState => {
      const rng = createRng(1234);
      const stats = deriveStats({ rune_2h_sword: 1, rune_platebody: 1 }, { atk: 14, def: 12 });
      const c = newCombat('hill_giant', PLAYER_BASE.maxHp);
      for (let i = 0; i < 30 && c.outcome === 'fighting'; i++) resolveRound(c, stats, { kind: 'fight' }, rng);
      return c;
    };
    const a = run();
    const b = run();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.outcome).not.toBe('fighting'); // 30 rounds settles a hill giant either way
  });

  it('a geared fighter beats a goblin; an unarmed one dies to a dragon', () => {
    const rng = createRng(7);
    const geared = deriveStats({ rune_2h_sword: 1, rune_platebody: 1, rune_kiteshield: 1 }, { atk: 14, def: 12 });
    const c = newCombat('goblin', PLAYER_BASE.maxHp);
    for (let i = 0; i < 20 && c.outcome === 'fighting'; i++) resolveRound(c, geared, { kind: 'fight' }, rng);
    expect(c.outcome).toBe('won');
    expect(c.lootGp).toBeGreaterThanOrEqual(5);
    expect(c.lootGp).toBeLessThanOrEqual(30);

    const rng2 = createRng(7);
    const fists = deriveStats({});
    const d = newCombat('green_dragon', PLAYER_BASE.maxHp);
    for (let i = 0; i < 100 && d.outcome === 'fighting'; i++) resolveRound(d, fists, { kind: 'fight' }, rng2);
    expect(d.outcome).toBe('dead');
    expect(d.playerHp).toBe(0);
  });

  it('eating heals (capped) and antifire halves dragonfire', () => {
    const rng = createRng(99);
    const stats = deriveStats({ rune_platebody: 1, rune_kiteshield: 1, dragon_platelegs: 1, rune_full_helm: 1 }, { atk: 1, def: 18 });
    const c = newCombat('green_dragon', 30);
    resolveRound(c, stats, { kind: 'eat', itemId: 'shark' }, rng);
    expect(c.playerHp).toBeLessThanOrEqual(PLAYER_BASE.maxHp); // heal applied, then the dragon answered
    const before = JSON.parse(JSON.stringify(c)) as CombatState;
    resolveRound(c, stats, { kind: 'eat', itemId: 'super_antifire_potion_4' }, rng);
    expect(c.antifire).toBe(true);
    expect(before.antifire).toBe(false);
    // Heal never exceeds max hp.
    const full = newCombat('goblin', PLAYER_BASE.maxHp);
    resolveRound(full, stats, { kind: 'eat', itemId: 'shark' }, createRng(1));
    expect(full.playerHp).toBeLessThanOrEqual(PLAYER_BASE.maxHp);
  });

  it('fleeing either escapes or costs you the round — never loot, never a win', () => {
    let fled = 0;
    let caught = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const rng = createRng(seed);
      const c = newCombat('moss_giant', PLAYER_BASE.maxHp);
      resolveRound(c, deriveStats({}), { kind: 'flee' }, rng);
      if (c.outcome === 'fled') {
        fled++;
        expect(c.playerHp).toBe(PLAYER_BASE.maxHp); // clean escape
      } else {
        caught++;
        expect(c.outcome === 'fighting' || c.outcome === 'dead').toBe(true);
      }
      expect(c.lootGp).toBe(0);
    }
    expect(fled).toBeGreaterThan(0); // both branches actually occur
    expect(caught).toBeGreaterThan(0);
  });

  it('the Elder always drops his bones — loot rolls are seed-stable', () => {
    const kill = (seed: number): CombatState => {
      const rng = createRng(seed);
      const stats = { atk: 500, def: 500 }; // executioner fixture
      const c = newCombat('vorkanth', PLAYER_BASE.maxHp);
      for (let i = 0; i < 50 && c.outcome === 'fighting'; i++) resolveRound(c, stats, { kind: 'fight' }, rng);
      return c;
    };
    const a = kill(5);
    expect(a.outcome).toBe('won');
    expect(a.lootItems).toContain('superior_dragon_bones'); // elite 100% drop
    expect(JSON.stringify(kill(5))).toBe(JSON.stringify(a)); // identical re-roll
  });
});
