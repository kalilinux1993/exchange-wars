// The Expeditions combat core (RPG arc, phase 8a). Pure and deterministic:
// every roll comes off the injected RNG interface, all state is plain JSON.
// Gear and loot reference REAL catalog item ids — what monsters drop mints
// into the live economy, what adventurers carry comes off the GE (8b).
import type { RNG } from './rng';

export type GearSlot = 'weapon' | 'helm' | 'body' | 'legs' | 'shield';

export interface GearDef {
  slot: GearSlot;
  atk: number;
  def: number;
}

/** Curated catalog items that function as gear. Best-per-slot counts. */
export const GEAR: Record<string, GearDef> = {
  adamant_dart: { slot: 'weapon', atk: 10, def: 0 },
  mystic_air_staff: { slot: 'weapon', atk: 30, def: 1 },
  mystic_earth_staff: { slot: 'weapon', atk: 32, def: 1 },
  rune_battleaxe: { slot: 'weapon', atk: 38, def: 0 },
  rune_2h_sword: { slot: 'weapon', atk: 45, def: 0 },
  dragon_med_helm: { slot: 'helm', atk: 0, def: 16 },
  rune_full_helm: { slot: 'helm', atk: 0, def: 12 },
  rune_platebody: { slot: 'body', atk: 0, def: 28 },
  rune_platelegs: { slot: 'legs', atk: 0, def: 20 },
  dragon_platelegs: { slot: 'legs', atk: 0, def: 30 },
  rune_kiteshield: { slot: 'shield', atk: 0, def: 18 },
};

export interface ConsumableDef {
  heal: number;
  /** Halves dragonfire damage for the rest of the fight when eaten. */
  antifire?: boolean;
}

export const CONSUMABLES: Record<string, ConsumableDef> = {
  shark: { heal: 20 },
  cooked_karambwan: { heal: 18 },
  prayer_regeneration_potion_4: { heal: 30 },
  super_antifire_potion_4: { heal: 5, antifire: true },
};

export interface MonsterDef {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  /** gp carried — minted on a kill (8b books it through the ledger). */
  gp: [min: number, max: number];
  /** Loot table: real catalog item ids with drop chances. */
  drops: { itemId: string; chance: number }[];
  /** Dragonfire: damage halved by an active antifire. */
  dragonfire?: boolean;
}

export const MONSTERS: MonsterDef[] = [
  { id: 'giant_rat', name: 'Giant rat', hp: 8, atk: 3, def: 0, gp: [2, 12], drops: [] },
  { id: 'goblin', name: 'Goblin', hp: 12, atk: 4, def: 1, gp: [5, 30], drops: [{ itemId: 'adamant_dart', chance: 0.15 }] },
  { id: 'skeleton', name: 'Skeleton', hp: 22, atk: 7, def: 3, gp: [15, 60], drops: [{ itemId: 'law_rune', chance: 0.12 }] },
  { id: 'hill_giant', name: 'Hill giant', hp: 35, atk: 9, def: 4, gp: [40, 180], drops: [{ itemId: 'nature_rune', chance: 0.25 }, { itemId: 'death_rune', chance: 0.1 }] },
  { id: 'moss_giant', name: 'Moss giant', hp: 45, atk: 11, def: 6, gp: [60, 240], drops: [{ itemId: 'blood_rune', chance: 0.18 }] },
  { id: 'lesser_demon', name: 'Lesser demon', hp: 70, atk: 16, def: 9, gp: [120, 450], drops: [{ itemId: 'death_rune', chance: 0.3 }, { itemId: 'rune_full_helm', chance: 0.03 }] },
  { id: 'fire_giant', name: 'Fire giant', hp: 85, atk: 19, def: 11, gp: [180, 600], drops: [{ itemId: 'rune_battleaxe', chance: 0.04 }, { itemId: 'blood_rune', chance: 0.35 }] },
  { id: 'green_dragon', name: 'Green dragon', hp: 110, atk: 24, def: 12, gp: [300, 900], dragonfire: true, drops: [{ itemId: 'superior_dragon_bones', chance: 1 }, { itemId: 'dragon_med_helm', chance: 0.01 }, { itemId: 'rune_kiteshield', chance: 0.05 }] },
];

export const PLAYER_BASE = { maxHp: 50, atk: 5, def: 2 };

export interface RegionDef {
  id: string;
  name: string;
  flavor: string;
  /** Encounter pool — picked uniformly per advance. */
  monsters: string[];
}

/** The node graph, easiest to deadliest. Clearing REGION_CLEAR_KILLS
 * encounters in your FRONTIER region unlocks the next one (progression
 * lives on the agent as questProgress — the highest index unlocked). */
export const REGIONS: RegionDef[] = [
  { id: 'lumbridge_plains', name: 'Lumbridge Plains', flavor: 'soft hills, soft monsters', monsters: ['giant_rat', 'goblin'] },
  { id: 'varrock_sewers', name: 'Varrock Sewers', flavor: 'it smells like XP down here', monsters: ['goblin', 'skeleton'] },
  { id: 'edgeville_dungeon', name: 'Edgeville Dungeon', flavor: 'the giants pay well', monsters: ['skeleton', 'hill_giant'] },
  { id: 'brimhaven_caverns', name: 'Brimhaven Caverns', flavor: 'moss, mould, and money', monsters: ['moss_giant', 'hill_giant'] },
  { id: 'wilderness_ruins', name: 'Wilderness Ruins', flavor: 'demons hoard runes', monsters: ['lesser_demon', 'fire_giant'] },
  { id: 'dragons_maw', name: "The Dragon's Maw", flavor: 'bring antifire or bring regrets', monsters: ['green_dragon', 'fire_giant'] },
];

export const REGION_CLEAR_KILLS = 3;

export function regionIndex(id: string): number {
  return REGIONS.findIndex((r) => r.id === id);
}

/** Deterministic per-expedition RNG seed: dungeon rolls never touch the
 * world's market cursor, so adventuring can't re-roll the economy. */
export function expeditionSeed(worldSeed: number, expeditionId: number): number {
  return ((worldSeed ^ 0x9e3779b9) + Math.imul(expeditionId, 0x85ebca6b)) >>> 0;
}

/** A pending choice event — resolved by the `choose` command. */
export interface EventState {
  kind: 'shrine' | 'gamble';
  prompt: string;
}

/** Encounter odds per advance (cumulative roll on the expedition RNG). */
export const ENCOUNTERS = {
  monster: 0.6,
  cache: 0.15,
  trap: 0.1,
  // remainder: a choice event (shrine/gamble, 50/50)
} as const;

export const SHRINE_MIN_COST = 50;
export const GAMBLE_STAKE = 100;

/** An expedition in progress — plain JSON, lives on the agent. */
export interface ExpeditionState {
  regionId: string;
  /** Private RNG cursor (see expeditionSeed). */
  rngState: number;
  hp: number;
  /** Carried items: escrowed OUT of inventory, COUNTED by checkInvariants. */
  pack: Record<string, number>;
  /** Loot gp (minted at each kill; burned on death, paid out on extract). */
  packGp: number;
  /** Encounters won this trip. */
  cleared: number;
  combat: CombatState | null;
  /** A pending choice event (mutually exclusive with combat). */
  event?: EventState | null;
  /** Field journal — what happened between fights (UI narration). */
  journal?: string[];
}

export interface FighterStats {
  atk: number;
  def: number;
}

/** Best gear per slot in the pack decides your stats. Quantity is irrelevant
 * for gear (one body is one body); consumables are spent one at a time. */
export function deriveStats(pack: Record<string, number>): FighterStats {
  const best: Partial<Record<GearSlot, GearDef>> = {};
  for (const [itemId, qty] of Object.entries(pack)) {
    if (qty < 1) continue;
    const g = GEAR[itemId];
    if (!g) continue;
    const cur = best[g.slot];
    if (!cur || g.atk + g.def > cur.atk + cur.def) best[g.slot] = g;
  }
  let atk = PLAYER_BASE.atk;
  let def = PLAYER_BASE.def;
  for (const g of Object.values(best)) {
    atk += g.atk;
    def += g.def;
  }
  return { atk, def };
}

export interface CombatState {
  monsterId: string;
  monsterHp: number;
  playerHp: number;
  /** Eaten an antifire this fight (halves dragonfire). */
  antifire: boolean;
  /** 'fighting' | 'won' | 'dead' | 'fled' */
  outcome: 'fighting' | 'won' | 'dead' | 'fled';
  /** Loot rolled on victory: gp + item ids (minted by the caller in 8b). */
  lootGp: number;
  lootItems: string[];
  /** Round-by-round narration for the UI. */
  log: string[];
}

export function monsterById(id: string): MonsterDef {
  const m = MONSTERS.find((x) => x.id === id);
  if (!m) throw new Error(`unknown monster ${id}`);
  return m;
}

export function newCombat(monsterId: string, playerHp: number): CombatState {
  const m = monsterById(monsterId);
  return {
    monsterId,
    monsterHp: m.hp,
    playerHp,
    antifire: false,
    outcome: 'fighting',
    lootGp: 0,
    lootItems: [],
    log: [`a ${m.name} blocks the path`],
  };
}

const FLEE_CHANCE = 0.6;

function hitChance(atk: number, def: number): number {
  return Math.min(0.95, Math.max(0.15, 0.55 + (atk - def) * 0.02));
}

function damage(rng: RNG, atk: number, def: number): number {
  const raw = rng.int(Math.max(1, Math.ceil(atk / 3)), Math.max(2, atk));
  return Math.max(1, raw - Math.floor(def / 4));
}

export type CombatAction =
  | { kind: 'fight' }
  | { kind: 'flee' }
  | { kind: 'eat'; itemId: string };

/**
 * One combat round, mutating state in place: the player acts, then the
 * monster strikes back if still standing. All randomness via `rng` — the
 * caller owns the cursor, so rounds replay exactly.
 */
export function resolveRound(
  state: CombatState,
  stats: FighterStats,
  action: CombatAction,
  rng: RNG,
): void {
  if (state.outcome !== 'fighting') return;
  const m = monsterById(state.monsterId);

  if (action.kind === 'flee') {
    if (rng.chance(FLEE_CHANCE)) {
      state.outcome = 'fled';
      state.log.push('you slip away into the shadows');
      return;
    }
    state.log.push('no escape — it cuts you off');
  } else if (action.kind === 'eat') {
    const c = CONSUMABLES[action.itemId];
    if (c) {
      state.playerHp = Math.min(PLAYER_BASE.maxHp, state.playerHp + c.heal);
      if (c.antifire) state.antifire = true;
      state.log.push(`you down the ${action.itemId.replace(/_/g, ' ')} (+${c.heal} hp)`);
    } else {
      state.log.push('nothing edible there');
    }
  } else {
    if (rng.chance(hitChance(stats.atk, m.def))) {
      const dmg = damage(rng, stats.atk, m.def);
      state.monsterHp -= dmg;
      state.log.push(`you strike the ${m.name} for ${dmg}`);
    } else {
      state.log.push(`the ${m.name} turns your blow`);
    }
    if (state.monsterHp <= 0) {
      state.outcome = 'won';
      state.lootGp = rng.int(m.gp[0], m.gp[1]);
      for (const d of m.drops) {
        if (rng.chance(d.chance)) state.lootItems.push(d.itemId);
      }
      state.log.push(`the ${m.name} falls — ${state.lootGp} gp${state.lootItems.length > 0 ? ' and loot' : ''}`);
      return;
    }
  }

  // The monster answers.
  if (rng.chance(hitChance(m.atk, stats.def))) {
    let dmg = damage(rng, m.atk, stats.def);
    if (m.dragonfire && state.antifire) dmg = Math.max(1, Math.floor(dmg / 2));
    state.playerHp -= dmg;
    state.log.push(`the ${m.name} hits you for ${dmg}${m.dragonfire && state.antifire ? ' (antifire holds)' : ''}`);
  } else {
    state.log.push(`you dodge the ${m.name}`);
  }
  if (state.playerHp <= 0) {
    state.playerHp = 0;
    state.outcome = 'dead';
    state.log.push('darkness takes you');
  }
}
