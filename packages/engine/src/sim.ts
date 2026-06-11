import { actAgent, TUNING } from './agents';
import { DEFAULT_ITEMS } from './catalog';
import { PROGRESSION } from './commands';
import { createBook } from './exchange';
import { PLAYER_BASE, REST_REGEN_TICKS } from './quest';
import { createRng } from './rng';
import type { AgentKind, AgentState, ItemDef, ItemId, WorldEvent, WorldState } from './types';

export interface SimConfig {
  seed: number;
  items?: ItemDef[];
  producersPerItem?: number;
  consumersPerItem?: number;
  marketMakersPerItem?: number;
  momentumTraders?: number;
  noiseTraders?: number;
  players?: number;
}

export function createWorld(cfg: SimConfig): WorldState {
  const items = cfg.items ?? DEFAULT_ITEMS;
  const state: WorldState = {
    tick: 0,
    seed: cfg.seed,
    rngState: createRng(cfg.seed).state(),
    nextOrderId: 1,
    items,
    agents: [],
    books: {},
    trades: [],
    events: [],
    contracts: [],
    nextContractId: 1,
    ledger: {
      gpInitial: 0,
      gpMinted: 0,
      gpBurned: 0,
      itemsInitial: {},
      itemsMinted: {},
      itemsBurned: {},
    },
    stats: {
      tradesTotal: 0,
      ordersPlaced: 0,
      ordersRejected: 0,
      ordersCancelled: 0,
      npcBailouts: 0,
      eventsSpawned: 0,
      contractsFilled: 0,
    },
  };
  for (const def of items) {
    state.books[def.id] = createBook(def.id, Math.round((def.baseCost + def.consumeValue) / 2));
  }

  const producersPerItem = cfg.producersPerItem ?? 2;
  const consumersPerItem = cfg.consumersPerItem ?? 3;
  const marketMakersPerItem = cfg.marketMakersPerItem ?? 1;
  // Speculators scale with catalog size — a fixed pool spread over more books
  // dilutes per-book liquidity until books go thin and one-sided (the 5→14
  // item expansion broke idle automation this way before this scaled).
  const momentumTraders = cfg.momentumTraders ?? Math.max(4, Math.round(items.length * 0.8));
  const noiseTraders = cfg.noiseTraders ?? Math.max(6, Math.round(items.length * 1.2));
  const players = cfg.players ?? 1;

  for (const def of items) {
    const mid = Math.round((def.baseCost + def.consumeValue) / 2);
    for (let i = 0; i < producersPerItem; i++) addAgent(state, 'producer', 0, { [def.id]: 20 }, def.id);
    for (let i = 0; i < consumersPerItem; i++) addAgent(state, 'consumer', def.consumeValue * 10, {}, def.id);
    for (let i = 0; i < marketMakersPerItem; i++) addAgent(state, 'marketMaker', mid * 40, { [def.id]: 12 }, def.id);
  }
  for (let i = 0; i < momentumTraders; i++) addAgent(state, 'momentum', 25_000, {});
  for (let i = 0; i < noiseTraders; i++) {
    const inv: Record<ItemId, number> = {};
    for (const def of items) inv[def.id] = 3;
    addAgent(state, 'noise', 8_000, inv);
  }
  for (let i = 0; i < players; i++) addAgent(state, 'player', 50_000, {});
  return state;
}

/** Also used by tests to build bespoke fixtures — keeps the ledger's initial totals honest. */
export function addAgent(
  state: WorldState,
  kind: AgentKind,
  gp: number,
  inventory: Record<ItemId, number>,
  itemId?: ItemId,
): AgentState {
  const agent: AgentState = {
    id: state.agents.length,
    kind,
    gp,
    inventory: { ...inventory },
    memo: { startGp: gp },
  };
  if (itemId !== undefined) agent.itemId = itemId;
  if (kind === 'player') {
    agent.slots = PROGRESSION.startingSlots;
    agent.policy = 'scripted-flipper';
  }
  state.agents.push(agent);
  state.ledger.gpInitial += gp;
  for (const k of Object.keys(inventory).sort()) {
    state.ledger.itemsInitial[k] = (state.ledger.itemsInitial[k] ?? 0) + (inventory[k] ?? 0);
  }
  return agent;
}

export function tickWorld(state: WorldState): void {
  const rng = createRng(state.rngState);
  state.tick++;
  if (!state.events) state.events = []; // migrate pre-event saves
  if (!state.contracts) state.contracts = []; // migrate pre-contract saves
  if (state.nextContractId === undefined) state.nextContractId = 1;
  if (state.tick % TUNING.contracts.checkEvery === 0) {
    state.contracts = state.contracts.filter((c) => c.expiresTick > state.tick);
    if (state.contracts.length < TUNING.contracts.maxOpen && rng.chance(TUNING.contracts.chance)) {
      const def = rng.pick(state.items);
      const book = state.books[def.id];
      if (book) {
        const mid = Math.max(1, Math.round(book.ema));
        const qty = Math.min(80, Math.max(2, Math.round(TUNING.contracts.targetGp / mid)));
        const premium =
          TUNING.contracts.premiumMin + rng.next() * (TUNING.contracts.premiumMax - TUNING.contracts.premiumMin);
        const duration = rng.int(TUNING.contracts.minDuration, TUNING.contracts.maxDuration);
        state.contracts.push({
          id: state.nextContractId++,
          itemId: def.id,
          qty,
          unitPrice: Math.max(1, Math.round(mid * premium)),
          expiresTick: state.tick + duration,
        });
      }
    }
  }
  if (state.tick % TUNING.events.checkEvery === 0) {
    state.events = state.events.filter((e) => e.endTick > state.tick);
    if (rng.chance(TUNING.events.chance)) {
      const def = rng.pick(state.items);
      if (!state.events.some((e) => e.itemId === def.id)) {
        const kinds: WorldEvent['kind'][] = ['supply_shock', 'demand_surge', 'supply_glut', 'demand_slump'];
        const kind = rng.pick(kinds);
        const duration = rng.int(TUNING.events.minDuration, TUNING.events.maxDuration);
        state.events.push({
          id: `${kind}_${def.id}_${state.tick}`,
          itemId: def.id,
          kind,
          startTick: state.tick,
          endTick: state.tick + duration,
        });
        state.stats.eventsSpawned++;
      }
    }
  }
  for (const agent of state.agents) {
    actAgent(state, agent, rng);
  }
  // Out-of-field rest: wounded players (hp present = wounded) mend +1 hp every
  // REST_REGEN_TICKS while NOT on expedition. No RNG; full health deletes the
  // field, restoring the canonical absent-=-full form.
  if (state.tick % REST_REGEN_TICKS === 0) {
    for (const agent of state.agents) {
      if (agent.kind !== 'player' || agent.hp === undefined || agent.expedition) continue;
      agent.hp += 1;
      if (agent.hp >= PLAYER_BASE.maxHp) delete agent.hp;
    }
  }
  state.rngState = rng.state();
}

export function runTicks(state: WorldState, n: number): void {
  for (let i = 0; i < n; i++) tickWorld(state);
}
