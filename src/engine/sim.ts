import { actAgent } from './agents';
import { DEFAULT_ITEMS } from './catalog';
import { PROGRESSION } from './commands';
import { createBook } from './exchange';
import { createRng } from './rng';
import type { AgentKind, AgentState, ItemDef, ItemId, WorldState } from './types';

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
    ledger: {
      gpInitial: 0,
      gpMinted: 0,
      gpBurned: 0,
      itemsInitial: {},
      itemsMinted: {},
      itemsBurned: {},
    },
    stats: { tradesTotal: 0, ordersPlaced: 0, ordersRejected: 0, ordersCancelled: 0, npcBailouts: 0 },
  };
  for (const def of items) {
    state.books[def.id] = createBook(def.id, Math.round((def.baseCost + def.consumeValue) / 2));
  }

  const producersPerItem = cfg.producersPerItem ?? 2;
  const consumersPerItem = cfg.consumersPerItem ?? 3;
  const marketMakersPerItem = cfg.marketMakersPerItem ?? 1;
  const momentumTraders = cfg.momentumTraders ?? 4;
  const noiseTraders = cfg.noiseTraders ?? 6;
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
  if (kind === 'player') agent.slots = PROGRESSION.startingSlots;
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
  for (const agent of state.agents) {
    actAgent(state, agent, rng);
  }
  state.rngState = rng.state();
}

export function runTicks(state: WorldState, n: number): void {
  for (let i = 0; i < n; i++) tickWorld(state);
}
