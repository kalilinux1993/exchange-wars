// The player surface. Bots, the future UI, and the future server all drive a
// player EXCLUSIVELY through applyCommand + playerView — never the internals.
// Everything in and out is plain JSON (null, never undefined in views).
import { TUNING } from './agents';
import { bestAsk, bestBid, cancelAgentOrders, placeOrder } from './exchange';
import { itemDef } from './items';
import {
  AMBUSH_CHANCE,
  CACHE_ITEM_CHANCE,
  ELITE_CHANCE,
  cachePool,
  CONSUMABLES,
  deriveStats,
  ENCOUNTERS,
  levelsOf,
  maxHpFor,
  monsterById,
  expeditionSeed,
  BLOOD_ATK,
  BLOOD_HP,
  COURIER_CUT,
  COURIER_FRACTION,
  FORGE_ATK,
  FORGE_COST,
  GAMBLE_STAKE,
  IMP_PRIZE,
  MERCHANT_MARKUP,
  newCombat,
  SPAR_BRUISES,
  SPAR_XP,
  TOLL_COST,
  PLAYER_BASE,
  REGION_CLEAR_KILLS,
  REGIONS,
  regionIndex,
  resolveRound,
  SHRINE_MIN_COST,
} from './quest';
import { createRng } from './rng';
import { tickWorld } from './sim';
import type { AgentState, ItemId, Side, Trade, WorldState } from './types';

/** Rolling GE buy-limit window — a command-layer mechanic (NPCs unaffected). */
export const BUY_LIMIT_WINDOW_TICKS = 4_000;

/** Region mastery (10i): first-clear combat-xp bounty = BASE + PER_REGION×idx. */
export const MASTERY_BASE = 40;
export const MASTERY_PER_REGION = 30;

/** Remaining GE buy allowance for this item in the current window (null = unlimited). */
function buyRemaining(state: WorldState, agent: AgentState, itemId: ItemId): number | null {
  const def = itemDef(state, itemId);
  const limit = def?.buyLimit ?? 0;
  if (limit <= 0) return null;
  const w = agent.buyWindows?.[itemId];
  if (!w || state.tick - w.windowStart >= BUY_LIMIT_WINDOW_TICKS) return limit;
  return Math.max(0, limit - w.bought);
}

export const PROGRESSION = {
  startingSlots: 3,
  maxSlots: 8,
  /** Cost of slot 4, 5, 6, 7, 8 — burned (gp sink), not paid to anyone. */
  slotCosts: [25_000, 75_000, 200_000, 500_000, 1_250_000],
  /** Automation tiers; cost of tier N is costs[N-1]. All burned. */
  upgrades: {
    autoFlip: { costs: [50_000, 150_000, 400_000] },
    /** The Sellsword (9h): a hireling who runs your expeditions while you
     * trade — shallow regions only, conservative, levels YOUR stats. */
    sellsword: { costs: [30_000] },
    /** Death Ward (10e): a deep gp sink that softens death — keep your 5 most
     * valuable carried items instead of 3. */
    deathWard: { costs: [100_000] },
  },
} as const;

export type UpgradeId = keyof typeof PROGRESSION.upgrades;

export type PlayerCommand =
  | { type: 'place'; itemId: ItemId; side: Side; price: number; qty: number }
  | { type: 'cancel'; itemId?: ItemId; side?: Side }
  | { type: 'buySlot' }
  | { type: 'buyUpgrade'; upgradeId: string }
  | { type: 'configureBot'; maxVolatility?: number; capitalFraction?: number; focusItemId?: ItemId | null }
  | { type: 'fulfillContract'; contractId: number }
  | { type: 'startExpedition'; regionId: string; pack: Record<ItemId, number> }
  | { type: 'advance' }
  | { type: 'fight' }
  | { type: 'fleeCombat' }
  | { type: 'eatFood'; itemId: ItemId }
  | { type: 'choose'; accept: boolean }
  | { type: 'extract' }
  | { type: 'claimBounty'; bountyId: number }
  | { type: 'configureSellsword'; active: boolean };

export interface CommandResult {
  ok: boolean;
  reason?: string;
  trades: Trade[];
}

export interface MarketView {
  itemId: ItemId;
  lastPrice: number;
  ema: number;
  bestBid: number | null;
  bestAsk: number | null;
  bestBidIsMine: boolean;
  bestAskIsMine: boolean;
  /** Total resting quantity on each side — exit-liquidity signal for bots. */
  bidDepth: number;
  askDepth: number;
  /** GE buy allowance left this window (null = no limit on this item). */
  buyRemaining: number | null;
  volume: number;
}

export interface OpenOrderView {
  id: number;
  itemId: ItemId;
  side: Side;
  price: number;
  remaining: number;
}

export interface PlayerView {
  playerId: number;
  gp: number;
  slots: number;
  /** null when already at max slots. */
  nextSlotCost: number | null;
  /** Purchased automation tiers by upgrade id. */
  upgrades: Record<string, number>;
  /** Clerk Orders — null fields mean "tier default". */
  botConfig: { maxVolatility: number | null; capitalFraction: number | null; focusItemId: ItemId | null };
  /** Open quartermaster contracts (world-public). */
  contracts: { id: number; itemId: ItemId; qty: number; unitPrice: number; expiresTick: number }[];
  inventory: Record<ItemId, number>;
  openOrders: OpenOrderView[];
  markets: MarketView[];
}

/** OSRS rules: keep your N most valuable carried UNITS (3 by default, 5 with
 * a Death Ward — 10e); the rest — and all loot gp — is lost to the depths
 * (burned; it was minted at the kills). */
export const DEATH_KEEP_BASE = 3;
export const DEATH_KEEP_WARDED = 5;
function expeditionDeath(
  state: WorldState,
  agent: AgentState,
  exp: NonNullable<AgentState['expedition']>,
): void {
  const keepN = (agent.upgrades?.['deathWard'] ?? 0) > 0 ? DEATH_KEEP_WARDED : DEATH_KEEP_BASE;
  const units: { itemId: ItemId; cost: number }[] = [];
  for (const [itemId, qty] of Object.entries(exp.pack)) {
    const cost = itemDef(state, itemId)?.baseCost ?? 0;
    for (let i = 0; i < qty; i++) units.push({ itemId, cost });
  }
  units.sort((a, b) => b.cost - a.cost || (a.itemId < b.itemId ? -1 : 1));
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (i < keepN) agent.inventory[u.itemId] = (agent.inventory[u.itemId] ?? 0) + 1;
    else state.ledger.itemsBurned[u.itemId] = (state.ledger.itemsBurned[u.itemId] ?? 0) + 1;
  }
  state.ledger.gpBurned += exp.packGp;
  state.stats.deaths = (state.stats.deaths ?? 0) + 1;
  agent.hp = 1; // you barely crawled home — rest before diving again
  delete agent.expedition;
}

/** Escrow a (pre-validated) pack and set out. Shared by startExpedition and
 * the Sellsword autopilot (9h). */
export function beginExpedition(
  state: WorldState,
  agent: AgentState,
  regionId: string,
  packIn: Record<ItemId, number>,
): void {
  const idx = regionIndex(regionId);
  const pack: Record<ItemId, number> = {};
  for (const [itemId, qty] of Object.entries(packIn)) {
    agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) - qty;
    pack[itemId] = qty;
  }
  const expId = state.nextExpeditionId ?? 1;
  state.nextExpeditionId = expId + 1;
  state.stats.deepestRegion = Math.max(state.stats.deepestRegion ?? 0, idx);
  agent.expedition = {
    regionId,
    rngState: expeditionSeed(state.seed, expId),
    // Wounds persist: you set out with the hp you came home with (absent =
    // full — full meaning your TRAINED max, 8s). Embarking hurt is allowed.
    hp: Math.min(maxHpFor(levelsOf(agent.combatXp).hp), Math.max(1, agent.hp ?? maxHpFor(levelsOf(agent.combatXp).hp))),
    pack,
    packGp: 0,
    cleared: 0,
    combat: null,
  };
}

/** Bank the pack and the loot gp; wounds come home too. Shared by extract
 * and the Sellsword autopilot (9h). */
export function finishExtract(agent: AgentState, exp: NonNullable<AgentState['expedition']>): void {
  for (const [itemId, qty] of Object.entries(exp.pack)) {
    if (qty > 0) agent.inventory[itemId] = (agent.inventory[itemId] ?? 0) + qty;
  }
  agent.gp += exp.packGp; // already minted at each kill
  // Wounds come home with you; full health (= TRAINED max, 8s) drops the
  // field (canonical absent-=-full form keeps never-hurt saves identical).
  if (exp.hp < maxHpFor(levelsOf(agent.combatXp).hp)) agent.hp = Math.max(1, exp.hp);
  else delete agent.hp;
  delete agent.expedition;
}

/** One combat round: the post-tick body of fight/flee/eat — burn, resolve,
 * leech, train, settle. Shared by the combat commands and the Sellsword
 * autopilot (9h); identical draw order either way. */
export function runCombatRound(
  state: WorldState,
  agent: AgentState,
  exp: NonNullable<AgentState['expedition']>,
  action: import('./quest').CombatAction,
): void {
  if (!exp.combat) return;
  if (action.kind === 'eat') {
    exp.pack[action.itemId] = exp.pack[action.itemId]! - 1;
    state.ledger.itemsBurned[action.itemId] = (state.ledger.itemsBurned[action.itemId] ?? 0) + 1;
    // One potion coats you for the whole dive (every later combat seeds
    // from this flag); it dies with the expedition.
    const cd = CONSUMABLES[action.itemId];
    if (cd?.antifire) exp.antifire = true;
    if (cd?.boostAtk || cd?.boostDef) exp.boost = { atk: cd.boostAtk ?? 0, def: cd.boostDef ?? 0 };
  }
  const rng = createRng(exp.rngState);
  const lvBefore = levelsOf(agent.combatXp);
  const hpBefore = { monster: exp.combat.monsterHp, player: exp.combat.playerHp };
  const stats = deriveStats(exp.pack, lvBefore);
  if (exp.boost) {
    stats.atk += exp.boost.atk;
    stats.def += exp.boost.def;
  }
  resolveRound(exp.combat, stats, action, rng);
  exp.rngState = rng.state();
  const c = exp.combat;
  // The Abyss bleeds purses: leeches drain loot gp every round the fight
  // drags on (burned — the dark banks nowhere). Kill fast or pay.
  const leech = monsterById(c.monsterId).leech ?? 0;
  if (leech > 0 && c.outcome === 'fighting' && exp.packGp > 0) {
    const drained = Math.min(exp.packGp, leech);
    exp.packGp -= drained;
    state.ledger.gpBurned += drained;
    c.log.push(`it siphons ${drained} gp from your pack`);
  }
  // Training: Attack xp = damage dealt, Defence xp = damage taken (eating
  // heals, so a net-positive round trains nothing defensively). Death
  // never takes xp — wounds cost loot, never experience.
  const dealt = Math.max(0, hpBefore.monster - c.monsterHp);
  const taken = Math.max(0, hpBefore.player - c.playerHp);
  if (dealt + taken > 0) {
    const xp = (agent.combatXp ??= { atk: 0, def: 0 });
    xp.atk += dealt;
    xp.def += taken;
    // Fighting hardens you: a third of damage dealt trains Hitpoints (8s).
    if (dealt > 0) xp.hp = (xp.hp ?? 0) + Math.ceil(dealt / 3);
    const lv = levelsOf(xp);
    const journal = (exp.journal ??= []);
    if (lv.atk > lvBefore.atk) journal.push(`your arm grows stronger — Attack ${lv.atk}`);
    if (lv.def > lvBefore.def) journal.push(`you learn to take a blow — Defence ${lv.def}`);
    if (lv.hp > lvBefore.hp) journal.push(`your vitality surges — Hitpoints ${lv.hp} (max hp ${maxHpFor(lv.hp)})`);
  }
  if (c.outcome === 'won') {
    state.ledger.gpMinted += c.lootGp; // monster coin is freshly struck
    exp.packGp += c.lootGp;
    for (const itemId of c.lootItems) {
      state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
      exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
    }
    exp.cleared += 1;
    exp.hp = c.playerHp;
    state.stats.monstersSlain = (state.stats.monstersSlain ?? 0) + 1;
    const tally = (state.stats.killsByMonster ??= {});
    tally[c.monsterId] = (tally[c.monsterId] ?? 0) + 1;
    if (monsterById(c.monsterId).elite) {
      state.stats.eliteSlain = (state.stats.eliteSlain ?? 0) + 1;
    }
    const idx = regionIndex(exp.regionId);
    if (exp.cleared >= REGION_CLEAR_KILLS && idx === (agent.questProgress ?? 0) && idx < REGIONS.length - 1) {
      agent.questProgress = idx + 1; // the frontier moves
      // Region mastery (10i): a one-time combat-xp bounty for the FIRST clear
      // of a region (questProgress only advances once per region), scaling
      // with depth — rewards pushing the frontier over farming one spot.
      const masteryXp = MASTERY_BASE + MASTERY_PER_REGION * idx;
      const mx = (agent.combatXp ??= { atk: 0, def: 0 });
      mx.atk += masteryXp;
      mx.def += masteryXp;
      mx.hp = (mx.hp ?? 0) + Math.ceil(masteryXp / 3);
      (exp.journal ??= []).push(`${REGIONS[idx]!.name} mastered — +${masteryXp} combat xp`);
    }
    exp.combat = null;
  } else if (c.outcome === 'dead') {
    expeditionDeath(state, agent, exp);
  } else if (c.outcome === 'fled') {
    exp.hp = c.playerHp;
    exp.combat = null; // escaped this encounter — no kill credit
  }
}

/** One expedition step: the post-tick body of `advance`, drawing ONLY from
 * the expedition's private stream. Shared by the advance command and the
 * Sellsword autopilot (9h) — one source of truth, identical draw order. */
export function rollEncounter(
  state: WorldState,
  agent: AgentState,
  exp: NonNullable<AgentState['expedition']>,
): void {
  const region = REGIONS[regionIndex(exp.regionId)]!;
  const rng = createRng(exp.rngState);
  const roll = rng.next();
  const journal = (exp.journal ??= []);
  if (roll < ENCOUNTERS.monster) {
    const rIdx = regionIndex(exp.regionId);
    const af = exp.antifire ?? false;
    const mhp = maxHpFor(levelsOf(agent.combatXp).hp);
    if (region.elite && rng.chance(ELITE_CHANCE)) {
      exp.combat = newCombat(
        region.elite,
        exp.hp,
        `the ground shakes — ${monsterById(region.elite).name.toUpperCase()} descends!`,
        af,
        mhp,
      );
    } else if (rIdx < REGIONS.length - 1 && rng.chance(AMBUSH_CHANCE)) {
      const deeper = REGIONS[rIdx + 1]!;
      const beast = rng.pick(deeper.monsters);
      exp.combat = newCombat(beast, exp.hp, `AMBUSH — a ${monsterById(beast).name} from ${deeper.name} crosses your path!`, af, mhp);
    } else {
      exp.combat = newCombat(rng.pick(region.monsters), exp.hp, undefined, af, mhp);
    }
  } else if (roll < ENCOUNTERS.monster + ENCOUNTERS.cache) {
    // A stash in the dark — coin, and sometimes goods (minted like drops).
    const rIdx = regionIndex(exp.regionId);
    const found = rng.int(20, 60 + 40 * rIdx);
    state.ledger.gpMinted += found;
    exp.packGp += found;
    state.stats.cacheFinds = (state.stats.cacheFinds ?? 0) + 1;
    if (rng.chance(CACHE_ITEM_CHANCE)) {
      const itemId = rng.pick(cachePool(rIdx));
      state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
      exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
      journal.push(`you pry open a forgotten cache: +${found} gp and a ${itemId.replace(/_/g, ' ')}`);
    } else {
      journal.push(`you pry open a forgotten cache: +${found} gp`);
    }
  } else if (roll < ENCOUNTERS.monster + ENCOUNTERS.cache + ENCOUNTERS.trap) {
    const dmg = rng.int(3, 6 + 3 * regionIndex(exp.regionId));
    exp.hp -= dmg;
    journal.push(`a snare bites — ${dmg} hp`);
    if (exp.hp <= 0) {
      journal.push('the trap was the last thing you never saw');
      expeditionDeath(state, agent, exp);
    }
  } else {
    // Region-flavored repertoire (8u): one draw picks from the pool the
    // depth deserves. Portals never spawn in the last region (nothing
    // deeper) or the plains (nothing to escalate FROM).
    const rIdx = regionIndex(exp.regionId);
    const kinds: import('./quest').EventState['kind'][] = ['shrine', 'gamble', 'imp'];
    if (rIdx >= 1 && rIdx < REGIONS.length - 1) kinds.push('portal');
    if (rIdx >= 1) kinds.push('spar');
    if (rIdx >= 2) kinds.push('toll');
    if (rIdx >= 2) kinds.push('courier');
    if (rIdx >= 2) kinds.push('forge');
    if (rIdx >= 2) kinds.push('altar');
    if (rIdx >= 3) kinds.push('merchant');
    const kind = rng.pick(kinds);
    const prompt =
      kind === 'shrine'
        ? 'a shrine hums in the dark — tithe a quarter of your loot gp for full healing?'
        : kind === 'gamble'
          ? `a goblin rattles a cup of dice — stake ${GAMBLE_STAKE} loot gp, double or nothing?`
          : kind === 'imp'
            ? 'an imp scampers past with a bulging coin pouch — give chase?'
            : kind === 'portal'
              ? `a humming portal opens — beyond it, ${REGIONS[rIdx + 1]!.name}. step through?`
              : kind === 'spar'
                ? 'a grizzled swordmaster bars the path, blade flat — take a lesson in bruises?'
                : kind === 'toll'
                  ? `a toll-keeper rattles his cup — ${TOLL_COST} gp for word of a nearby stash?`
                  : kind === 'courier'
                    ? `a strongbox courier offers to ship half your loot home, safe from death — for a ${Math.round(COURIER_CUT * 100)}% cut?`
                    : kind === 'forge'
                      ? `a wandering smith fires a field forge — ${FORGE_COST} gp to whet your blade for +${FORGE_ATK} Attack the rest of this dive?`
                      : kind === 'altar'
                        ? `a blood altar pulses — spill ${BLOOD_HP} health for +${BLOOD_ATK} Attack the rest of this dive?`
                        : 'a soot-cloaked merchant offers a shark at triple price — pay up?';
    exp.event = { kind, prompt };
  }
  exp.rngState = rng.state();
}

/** The Sellsword autopilot (9h): one conservative expedition action per
 * TUNING.sellsword.cadence ticks, run INSIDE tickWorld (no recursive ticks —
 * the ambient tick IS the time cost, same pricing as a human command).
 * Draws only from the expedition stream; sims without the upgrade are
 * byte-identical, so no gate re-rolls. */
export function actSellsword(state: WorldState, agent: AgentState): void {
  if (agent.kind !== 'player' || !agent.sellsword || (agent.upgrades?.['sellsword'] ?? 0) < 1) return;
  const T = TUNING.sellsword;
  if (state.tick % T.cadence !== 0) return;
  const exp = agent.expedition;
  if (!exp) {
    // Rest until fit (regen does the work), then set out empty-handed —
    // a hireling never gambles YOUR kit.
    const max = maxHpFor(levelsOf(agent.combatXp).hp);
    if ((agent.hp ?? max) < Math.min(T.embarkHp, max)) return;
    // Hunt the deepest region it will actually FIGHT in — a cap alone would
    // send it somewhere it flees everything and earns nothing.
    let target = Math.min(agent.questProgress ?? 0, T.maxRegion);
    while (target > 0 && !REGIONS[target]!.monsters.some((id) => monsterById(id).atk < T.fleeAtk)) target--;
    beginExpedition(state, agent, REGIONS[target]!.id, {});
    return;
  }
  if (exp.combat) {
    const m = monsterById(exp.combat.monsterId);
    const danger = m.elite === true || m.dragonfire === true || (m.leech ?? 0) > 0 || m.atk >= T.fleeAtk;
    const action: import('./quest').CombatAction =
      danger || exp.combat.playerHp < T.retreatHp ? { kind: 'flee' } : { kind: 'fight' };
    const slainBefore = state.stats.monstersSlain ?? 0;
    runCombatRound(state, agent, exp, action);
    // Attribute the hireling's own kills so its offline haul is visible (10k).
    if ((state.stats.monstersSlain ?? 0) > slainBefore) {
      state.stats.sellswordKills = (state.stats.sellswordKills ?? 0) + 1;
    }
    return;
  }
  if (exp.event) {
    // A hireling makes no bargains with the dark on your behalf.
    (exp.journal ??= []).push('the sellsword walks on');
    exp.event = null;
    return;
  }
  if (exp.cleared >= REGION_CLEAR_KILLS || exp.hp < T.retreatHp) {
    state.stats.sellswordBanked = (state.stats.sellswordBanked ?? 0) + exp.packGp; // what it brought home
    finishExtract(agent, exp);
    return;
  }
  rollEncounter(state, agent, exp);
}

function playerOf(state: WorldState, playerId: number): AgentState | null {
  const agent = state.agents[playerId];
  if (!agent || agent.id !== playerId || agent.kind !== 'player') return null;
  return agent;
}

function slotsOf(agent: AgentState): number {
  return agent.slots ?? PROGRESSION.startingSlots;
}

export function countOpenOrders(state: WorldState, agentId: number): number {
  let n = 0;
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    for (const o of book.buys) if (o.agentId === agentId) n++;
    for (const o of book.sells) if (o.agentId === agentId) n++;
  }
  return n;
}

export function applyCommand(state: WorldState, playerId: number, cmd: PlayerCommand): CommandResult {
  const agent = state.agents[playerId];
  if (!agent || agent.id !== playerId) return { ok: false, reason: 'unknown-player', trades: [] };
  if (agent.kind !== 'player') return { ok: false, reason: 'not-a-player', trades: [] };

  switch (cmd.type) {
    case 'place': {
      // GE model: submitting an offer requires a free slot, even if it would fill instantly.
      if (countOpenOrders(state, agent.id) >= slotsOf(agent)) {
        return { ok: false, reason: 'no-free-slots', trades: [] };
      }
      if (cmd.side === 'buy') {
        const remaining = buyRemaining(state, agent, cmd.itemId);
        if (remaining !== null && cmd.qty > remaining) {
          return { ok: false, reason: 'buy-limit', trades: [] };
        }
      }
      const res = placeOrder(state, agent, cmd.itemId, cmd.side, cmd.price, cmd.qty);
      if (res.accepted && cmd.side === 'buy') {
        const def = itemDef(state, cmd.itemId);
        if ((def?.buyLimit ?? 0) > 0) {
          // Counted at PLACEMENT, never refunded on cancel — placing an offer
          // reserves your allowance (stricter than OSRS fill-counting; simpler
          // and not gameable by place/cancel churn).
          if (!agent.buyWindows) agent.buyWindows = {};
          const w = agent.buyWindows[cmd.itemId];
          if (!w || state.tick - w.windowStart >= BUY_LIMIT_WINDOW_TICKS) {
            agent.buyWindows[cmd.itemId] = { windowStart: state.tick, bought: cmd.qty };
          } else {
            w.bought += cmd.qty;
          }
        }
      }
      const out: CommandResult = { ok: res.accepted, trades: res.trades };
      if (res.reason !== undefined) out.reason = res.reason;
      return out;
    }
    case 'cancel': {
      cancelAgentOrders(state, agent, cmd.itemId, cmd.side);
      return { ok: true, trades: [] };
    }
    case 'buySlot': {
      const slots = slotsOf(agent);
      const cost = PROGRESSION.slotCosts[slots - PROGRESSION.startingSlots];
      if (cost === undefined || slots >= PROGRESSION.maxSlots) {
        return { ok: false, reason: 'max-slots', trades: [] };
      }
      if (agent.gp < cost) return { ok: false, reason: 'insufficient-gp', trades: [] };
      agent.gp -= cost;
      state.ledger.gpBurned += cost; // unlock gp leaves the world — it's a sink
      agent.slots = slots + 1;
      return { ok: true, trades: [] };
    }
    case 'buyUpgrade': {
      // Object.hasOwn blocks prototype-chain keys ('__proto__', 'constructor')
      // in hostile/malformed commands — indexing those would throw mid-tick.
      if (!Object.hasOwn(PROGRESSION.upgrades, cmd.upgradeId)) {
        return { ok: false, reason: 'unknown-upgrade', trades: [] };
      }
      const def = PROGRESSION.upgrades[cmd.upgradeId as UpgradeId];
      const tier = agent.upgrades?.[cmd.upgradeId] ?? 0;
      const cost = def.costs[tier];
      if (cost === undefined) return { ok: false, reason: 'max-tier', trades: [] };
      if (agent.gp < cost) return { ok: false, reason: 'insufficient-gp', trades: [] };
      agent.gp -= cost;
      state.ledger.gpBurned += cost; // burned, like slots
      if (!agent.upgrades) agent.upgrades = {};
      agent.upgrades[cmd.upgradeId] = tier + 1;
      return { ok: true, trades: [] };
    }
    case 'configureBot': {
      // Clerk Orders: a clamped patch. Runtime still applies tier ceilings —
      // config can only ever make automation MORE conservative than its tier.
      const cfg = { ...(agent.botConfig ?? {}) };
      if (cmd.maxVolatility !== undefined) {
        if (!Number.isFinite(cmd.maxVolatility)) return { ok: false, reason: 'bad-config', trades: [] };
        cfg.maxVolatility = Math.min(1, Math.max(0.01, cmd.maxVolatility));
      }
      if (cmd.capitalFraction !== undefined) {
        if (!Number.isFinite(cmd.capitalFraction)) return { ok: false, reason: 'bad-config', trades: [] };
        cfg.capitalFraction = Math.min(0.5, Math.max(0.1, cmd.capitalFraction));
      }
      if (cmd.focusItemId !== undefined) {
        if (cmd.focusItemId !== null && !state.items.some((i) => i.id === cmd.focusItemId)) {
          return { ok: false, reason: 'unknown-item', trades: [] };
        }
        cfg.focusItemId = cmd.focusItemId;
      }
      agent.botConfig = cfg;
      return { ok: true, trades: [] };
    }
    case 'fulfillContract': {
      const contracts = state.contracts ?? [];
      const idx = contracts.findIndex((c) => c.id === cmd.contractId);
      if (idx === -1) return { ok: false, reason: 'unknown-contract', trades: [] };
      const contract = contracts[idx]!;
      if (contract.expiresTick <= state.tick) return { ok: false, reason: 'contract-expired', trades: [] };
      // Delivery comes from free inventory only — escrowed items don't count.
      if ((agent.inventory[contract.itemId] ?? 0) < contract.qty) {
        return { ok: false, reason: 'insufficient-items', trades: [] };
      }
      agent.inventory[contract.itemId] = (agent.inventory[contract.itemId] ?? 0) - contract.qty;
      state.ledger.itemsBurned[contract.itemId] =
        (state.ledger.itemsBurned[contract.itemId] ?? 0) + contract.qty; // goods leave the world
      const payout = contract.qty * contract.unitPrice;
      agent.gp += payout;
      state.ledger.gpMinted += payout; // the quartermaster's coin is freshly struck
      contracts.splice(idx, 1);
      state.stats.contractsFilled = (state.stats.contractsFilled ?? 0) + 1;
      return { ok: true, trades: [] };
    }
    case 'startExpedition': {
      if (agent.expedition) return { ok: false, reason: 'already-out', trades: [] };
      const idx = regionIndex(cmd.regionId);
      if (idx === -1) return { ok: false, reason: 'unknown-region', trades: [] };
      if (idx > (agent.questProgress ?? 0)) return { ok: false, reason: 'region-locked', trades: [] };
      if (typeof cmd.pack !== 'object' || cmd.pack === null) return { ok: false, reason: 'bad-pack', trades: [] };
      for (const [itemId, qty] of Object.entries(cmd.pack)) {
        if (!Number.isSafeInteger(qty) || qty < 1) return { ok: false, reason: 'bad-pack', trades: [] };
        if ((agent.inventory[itemId] ?? 0) < qty) return { ok: false, reason: 'insufficient-items', trades: [] };
      }
      beginExpedition(state, agent, cmd.regionId, cmd.pack);
      return { ok: true, trades: [] };
    }
    case 'advance': {
      const exp = agent.expedition;
      if (!exp) return { ok: false, reason: 'not-out', trades: [] };
      if (exp.combat) return { ok: false, reason: 'in-combat', trades: [] };
      if (exp.event) return { ok: false, reason: 'in-event', trades: [] };
      // The trek costs time: each step forward advances the world one tick,
      // so a sprint's grind is bounded by the same clock the market runs on
      // (without this, score scales with raw command spam — FINDINGS #45).
      // Safe in replay: recorded ticks fully determine application order.
      tickWorld(state);
      rollEncounter(state, agent, exp);
      return { ok: true, trades: [] };
    }
    case 'choose': {
      const exp = agent.expedition;
      if (!exp || !exp.event) return { ok: false, reason: 'no-event', trades: [] };
      const ev = exp.event;
      const rng = createRng(exp.rngState);
      const journal = (exp.journal ??= []);
      if (!cmd.accept) {
        journal.push('you walk on');
      } else if (ev.kind === 'shrine') {
        const cost = Math.max(SHRINE_MIN_COST, Math.floor(exp.packGp / 4));
        if (exp.packGp < cost) {
          journal.push('the shrine finds your offering wanting');
        } else {
          exp.packGp -= cost;
          state.ledger.gpBurned += cost; // the gods bank elsewhere
          exp.hp = maxHpFor(levelsOf(agent.combatXp).hp); // full = trained max
          journal.push(`the shrine takes ${cost} gp and knits your wounds`);
        }
      } else if (ev.kind === 'portal') {
        // Depth tourism: one region past wherever you stand — no unlock, just
        // nerve. The deepest-region badge counts it; so do the ambush-grade
        // monsters on the other side.
        const idx = Math.min(regionIndex(exp.regionId) + 1, REGIONS.length - 1);
        exp.regionId = REGIONS[idx]!.id;
        state.stats.deepestRegion = Math.max(state.stats.deepestRegion ?? 0, idx);
        journal.push(`you step through — ${REGIONS[idx]!.name}`);
      } else if (ev.kind === 'imp') {
        if (rng.chance(0.5)) {
          const prize = rng.int(IMP_PRIZE[0], IMP_PRIZE[1]);
          state.ledger.gpMinted += prize;
          exp.packGp += prize;
          journal.push(`you snatch the pouch: +${prize} gp`);
        } else {
          const dmg = rng.int(4, 8 + 2 * regionIndex(exp.regionId));
          exp.hp -= dmg;
          journal.push(`the imp leads you into a snare — ${dmg} hp`);
          if (exp.hp <= 0) {
            journal.push("the imp's laughter is the last thing you hear");
            expeditionDeath(state, agent, exp);
          }
        }
      } else if (ev.kind === 'spar') {
        // A lesson, not a mugging: bruises floor at 1 hp, the wisdom is real.
        const bruise = rng.int(SPAR_BRUISES[0], SPAR_BRUISES[1]);
        exp.hp = Math.max(1, exp.hp - bruise);
        const lvBefore = levelsOf(agent.combatXp);
        const xp = (agent.combatXp ??= { atk: 0, def: 0 });
        xp.atk += SPAR_XP;
        xp.def += SPAR_XP;
        xp.hp = (xp.hp ?? 0) + Math.ceil(SPAR_XP / 3);
        const lv = levelsOf(xp);
        journal.push(`the swordmaster's lesson leaves bruises (−${bruise} hp) — and understanding (+${SPAR_XP} ⚔, +${SPAR_XP} 🛡 xp)`);
        if (lv.atk > lvBefore.atk) journal.push(`your arm grows stronger — Attack ${lv.atk}`);
        if (lv.def > lvBefore.def) journal.push(`you learn to take a blow — Defence ${lv.def}`);
        if (lv.hp > lvBefore.hp) journal.push(`your vitality surges — Hitpoints ${lv.hp} (max hp ${maxHpFor(lv.hp)})`);
      } else if (ev.kind === 'toll') {
        if (exp.packGp < TOLL_COST) {
          journal.push('the toll-keeper sizes up your purse and waves you off');
        } else {
          exp.packGp -= TOLL_COST;
          state.ledger.gpBurned += TOLL_COST; // his cut leaves the world
          const rIdx = regionIndex(exp.regionId);
          const found = rng.int(20, 60 + 40 * rIdx);
          state.ledger.gpMinted += found;
          exp.packGp += found;
          state.stats.cacheFinds = (state.stats.cacheFinds ?? 0) + 1;
          if (rng.chance(CACHE_ITEM_CHANCE)) {
            const itemId = rng.pick(cachePool(rIdx));
            state.ledger.itemsMinted[itemId] = (state.ledger.itemsMinted[itemId] ?? 0) + 1;
            exp.pack[itemId] = (exp.pack[itemId] ?? 0) + 1;
            journal.push(`the toll-keeper's tip is good: a stash with ${found} gp and a ${itemId.replace(/_/g, ' ')}`);
          } else {
            journal.push(`the toll-keeper's tip is good: a stash with ${found} gp`);
          }
        }
      } else if (ev.kind === 'courier') {
        // Ship a fraction of loot gp to your SAFE purse (death burns packGp,
        // not agent.gp), the courier keeping a cut that leaves the world.
        const shipped = Math.floor(exp.packGp * COURIER_FRACTION);
        if (shipped <= 0) {
          journal.push('the courier shrugs — nothing worth shipping yet');
        } else {
          const cut = Math.floor(shipped * COURIER_CUT);
          exp.packGp -= shipped;
          agent.gp += shipped - cut; // banked, safe from death
          state.ledger.gpBurned += cut; // the courier's fee leaves the world
          journal.push(`the courier ships ${(shipped - cut).toLocaleString('en-US')} gp home (${cut} gp cut)`);
        }
      } else if (ev.kind === 'merchant') {
        const price = (itemDef(state, 'shark')?.baseCost ?? 700) * MERCHANT_MARKUP;
        if (exp.packGp < price) {
          journal.push('the merchant eyes your purse and turns away');
        } else {
          exp.packGp -= price;
          state.ledger.gpBurned += price; // his margin leaves the world
          state.ledger.itemsMinted['shark'] = (state.ledger.itemsMinted['shark'] ?? 0) + 1;
          exp.pack['shark'] = (exp.pack['shark'] ?? 0) + 1;
          journal.push(`the merchant takes ${price} gp and hands over a shark`);
        }
      } else if (ev.kind === 'forge') {
        // A gp sink that aids raiding: buy a dive-long Attack boost with loot
        // gp — the same exp.boost the brews grant, composing with them (take
        // the better atk, keep any def boost already up). His fee leaves the world.
        if (exp.packGp < FORGE_COST) {
          journal.push('the smith eyes your purse and lets the fire die');
        } else {
          exp.packGp -= FORGE_COST;
          state.ledger.gpBurned += FORGE_COST;
          const prevDef = exp.boost?.def ?? 0;
          exp.boost = { atk: Math.max(exp.boost?.atk ?? 0, FORGE_ATK), def: prevDef };
          journal.push(`the smith whets your blade — +${FORGE_ATK} Attack until you surface`);
        }
      } else if (ev.kind === 'altar') {
        // The forge's inverse: pay HEALTH for a dive-long Attack boost. Refused
        // unless you can spare the blood (hp must EXCEED the cost), so it never
        // kills you outright — the risk is the buffer you give up. No ledger
        // change (hp + boost only); composes with brews like the forge.
        if (exp.hp <= BLOOD_HP) {
          journal.push('the altar hungers for more blood than you can spare');
        } else {
          exp.hp -= BLOOD_HP;
          const prevDef = exp.boost?.def ?? 0;
          exp.boost = { atk: Math.max(exp.boost?.atk ?? 0, BLOOD_ATK), def: prevDef };
          journal.push(`you spill ${BLOOD_HP} hp on the altar — +${BLOOD_ATK} Attack until you surface`);
        }
      } else {
        if (exp.packGp < GAMBLE_STAKE) {
          journal.push('the goblin counts your purse and laughs');
        } else if (rng.chance(0.5)) {
          state.ledger.gpMinted += GAMBLE_STAKE;
          exp.packGp += GAMBLE_STAKE;
          state.stats.diceWon = (state.stats.diceWon ?? 0) + 1;
          journal.push(`the dice land your way: +${GAMBLE_STAKE} gp`);
        } else {
          exp.packGp -= GAMBLE_STAKE;
          state.ledger.gpBurned += GAMBLE_STAKE;
          journal.push(`the goblin scoops your ${GAMBLE_STAKE} gp, cackling`);
        }
      }
      exp.event = null;
      exp.rngState = rng.state();
      return { ok: true, trades: [] };
    }
    case 'fight':
    case 'fleeCombat':
    case 'eatFood': {
      const exp = agent.expedition;
      if (cmd.type === 'eatFood') {
        if (!exp) return { ok: false, reason: 'not-out', trades: [] };
        if (!CONSUMABLES[cmd.itemId]) return { ok: false, reason: 'not-edible', trades: [] };
        if ((exp.pack[cmd.itemId] ?? 0) < 1) return { ok: false, reason: 'insufficient-items', trades: [] };
        if (!exp.combat) {
          if (exp.event) return { ok: false, reason: 'in-event', trades: [] };
          // The camp meal (9a): eat between fights — time passes, nothing
          // swings at you. Heal by the fire; drink the antifire BEFORE the
          // Maw instead of at the first dragon's face.
          tickWorld(state);
          exp.pack[cmd.itemId] = exp.pack[cmd.itemId]! - 1;
          state.ledger.itemsBurned[cmd.itemId] = (state.ledger.itemsBurned[cmd.itemId] ?? 0) + 1;
          const c = CONSUMABLES[cmd.itemId]!;
          exp.hp = Math.min(maxHpFor(levelsOf(agent.combatXp).hp), exp.hp + c.heal);
          if (c.antifire) exp.antifire = true;
          if (c.boostAtk || c.boostDef) exp.boost = { atk: c.boostAtk ?? 0, def: c.boostDef ?? 0 };
          (exp.journal ??= []).push(
            `you ${c.antifire || c.boostAtk || c.boostDef ? 'down' : 'eat'} the ${cmd.itemId.replace(/_/g, ' ')} by the fire (+${c.heal} hp)`,
          );
          return { ok: true, trades: [] };
        }
      }
      if (!exp || !exp.combat) return { ok: false, reason: 'not-in-combat', trades: [] };
      let action: import('./quest').CombatAction;
      if (cmd.type === 'fight') action = { kind: 'fight' };
      else if (cmd.type === 'fleeCombat') action = { kind: 'flee' };
      else action = { kind: 'eat', itemId: cmd.itemId };
      // A combat round costs a world tick too — otherwise loot scales with
      // command spam, not sprint time (same lever as 'advance', FINDINGS #45).
      tickWorld(state);
      runCombatRound(state, agent, exp, action);
      return { ok: true, trades: [] };
    }
    case 'extract': {
      const exp = agent.expedition;
      if (!exp) return { ok: false, reason: 'not-out', trades: [] };
      if (exp.combat) return { ok: false, reason: 'in-combat', trades: [] };
      finishExtract(agent, exp);
      return { ok: true, trades: [] };
    }
    case 'configureSellsword': {
      if ((agent.upgrades?.['sellsword'] ?? 0) < 1) return { ok: false, reason: 'no-sellsword', trades: [] };
      if (cmd.active) agent.sellsword = true;
      else delete agent.sellsword; // canonical absent-=-off
      return { ok: true, trades: [] };
    }
    case 'claimBounty': {
      const bounties = state.bounties ?? [];
      const idx = bounties.findIndex((b) => b.id === cmd.bountyId);
      if (idx === -1) return { ok: false, reason: 'unknown-bounty', trades: [] };
      const b = bounties[idx]!;
      if (b.expiresTick <= state.tick) return { ok: false, reason: 'bounty-expired', trades: [] };
      const kills = (state.stats.killsByMonster?.[b.monsterId] ?? 0) - b.baseline;
      if (kills < b.qty) return { ok: false, reason: 'bounty-unfilled', trades: [] };
      // The realm pays in freshly struck coin — booked like every faucet.
      state.ledger.gpMinted += b.rewardGp;
      agent.gp += b.rewardGp;
      state.stats.bountiesClaimed = (state.stats.bountiesClaimed ?? 0) + 1;
      bounties.splice(idx, 1);
      return { ok: true, trades: [] };
    }
  }
}

export function playerView(state: WorldState, playerId: number): PlayerView | null {
  const agent = playerOf(state, playerId);
  if (!agent) return null;
  const slots = slotsOf(agent);
  const openOrders: OpenOrderView[] = [];
  const markets: MarketView[] = [];
  for (const def of state.items) {
    const book = state.books[def.id];
    if (!book) continue;
    let bidDepth = 0;
    let askDepth = 0;
    for (const o of book.buys) {
      bidDepth += o.remaining;
      if (o.agentId === agent.id) {
        openOrders.push({ id: o.id, itemId: o.itemId, side: o.side, price: o.price, remaining: o.remaining });
      }
    }
    for (const o of book.sells) {
      askDepth += o.remaining;
      if (o.agentId === agent.id) {
        openOrders.push({ id: o.id, itemId: o.itemId, side: o.side, price: o.price, remaining: o.remaining });
      }
    }
    const bid = bestBid(book);
    const ask = bestAsk(book);
    markets.push({
      itemId: def.id,
      lastPrice: book.lastPrice,
      ema: book.ema,
      bestBid: bid ? bid.price : null,
      bestAsk: ask ? ask.price : null,
      bestBidIsMine: bid !== undefined && bid.agentId === agent.id,
      bestAskIsMine: ask !== undefined && ask.agentId === agent.id,
      bidDepth,
      askDepth,
      buyRemaining: buyRemaining(state, agent, def.id),
      volume: book.volume,
    });
  }
  return {
    playerId: agent.id,
    gp: agent.gp,
    slots,
    nextSlotCost: PROGRESSION.slotCosts[slots - PROGRESSION.startingSlots] ?? null,
    upgrades: { ...(agent.upgrades ?? {}) },
    botConfig: {
      maxVolatility: agent.botConfig?.maxVolatility ?? null,
      capitalFraction: agent.botConfig?.capitalFraction ?? null,
      focusItemId: agent.botConfig?.focusItemId ?? null,
    },
    contracts: (state.contracts ?? [])
      .filter((c) => c.expiresTick > state.tick)
      .map((c) => ({ id: c.id, itemId: c.itemId, qty: c.qty, unitPrice: c.unitPrice, expiresTick: c.expiresTick })),
    inventory: { ...agent.inventory },
    openOrders,
    markets,
  };
}
