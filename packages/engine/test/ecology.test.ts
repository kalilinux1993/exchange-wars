import { describe, expect, it } from 'vitest';
import { actAgent, TUNING } from '../src/agents';
import { applyCommand } from '../src/commands';
import { placeOrder } from '../src/exchange';
import { checkInvariants } from '../src/invariants';
import { createRng } from '../src/rng';
import { addAgent, createWorld } from '../src/sim';
import type { ItemDef, WorldState } from '../src/types';

const ORE: ItemDef = { id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.1 };

function emptyWorld(): WorldState {
  return createWorld({
    seed: 1,
    items: [ORE],
    producersPerItem: 0,
    consumersPerItem: 0,
    marketMakersPerItem: 0,
    momentumTraders: 0,
    noiseTraders: 0,
    players: 0,
  });
}

/** Advance state.tick so (tick + agentId) hits the agent's cadence boundary. */
function alignTick(state: WorldState, agentId: number, cadence: number): void {
  while ((state.tick + agentId) % cadence !== 0) state.tick++;
}

describe('npc ecology', () => {
  /** Simulate trading losses conservation-correctly: book the loss as a burn. */
  function drainTo(state: WorldState, agent: { gp: number }, target: number): void {
    state.ledger.gpBurned += agent.gp - target;
    agent.gp = target;
  }

  it('bails out a nearly-broke noise trader via ledger mint, with cooldown', () => {
    const state = emptyWorld();
    const rng = createRng(7);
    const npc = addAgent(state, 'noise', 8_000, {});
    drainTo(state, npc, 100); // far below 20% of starting bankroll
    alignTick(state, npc.id, TUNING.noise.cadence);
    actAgent(state, npc, rng);
    expect(npc.gp).toBeGreaterThan(5_000); // restored (it may escrow a buy right after)
    expect(state.stats.npcBailouts).toBe(1);
    expect(state.ledger.gpMinted).toBe(7_900);
    expect(npc.memo['lastBailout']).toBe(state.tick);
    checkInvariants(state);

    // Within cooldown: no second bailout.
    drainTo(state, npc, 50);
    state.tick += TUNING.noise.cadence;
    actAgent(state, npc, rng);
    expect(state.stats.npcBailouts).toBe(1);
    checkInvariants(state);

    // Past cooldown: bails out again.
    state.tick += TUNING.npc.bailoutCooldownTicks;
    alignTick(state, npc.id, TUNING.noise.cadence);
    actAgent(state, npc, rng);
    expect(state.stats.npcBailouts).toBe(2);
    checkInvariants(state);
  });

  it('producer pays production cost (burned) when funded, produces free when broke', () => {
    const state = emptyWorld();
    const rng = createRng(7);
    const rich = addAgent(state, 'producer', 10_000, {}, 'ore');
    alignTick(state, rich.id, TUNING.producer.cadence);
    actAgent(state, rich, rng);
    const cost = ORE.baseCost * TUNING.producer.batch;
    expect(rich.gp).toBe(10_000 - cost);
    expect(state.ledger.gpBurned).toBe(cost);
    expect(state.ledger.itemsMinted['ore']).toBe(TUNING.producer.batch);
    checkInvariants(state);

    const broke = addAgent(state, 'producer', 0, {}, 'ore');
    alignTick(state, broke.id, TUNING.producer.cadence);
    const burnedBefore = state.ledger.gpBurned;
    actAgent(state, broke, rng);
    expect(broke.gp).toBe(0);
    expect(state.ledger.gpBurned).toBe(burnedBefore); // no burn when broke
    expect(state.ledger.itemsMinted['ore']).toBe(TUNING.producer.batch * 2); // still produced
    checkInvariants(state);
  });
});

describe('flipper cost basis', () => {
  it('fresh positions never list below post-tax break-even', () => {
    const state = emptyWorld();
    const rng = createRng(7);
    const seller = addAgent(state, 'player', 10_000, { ore: 50 });
    const flipper = addAgent(state, 'player', 50_000, { ore: 10 });
    placeOrder(state, seller, 'ore', 'sell', 90, 5); // market ask 90 → naive re-list would be 89
    flipper.memo['basis_ore'] = 100; // bought at 100
    flipper.memo['since_ore'] = 0;
    state.tick = 0;
    alignTick(state, flipper.id, TUNING.player.cadence);
    actAgent(state, flipper, rng);
    const mySell = state.books['ore']!.sells.find((o) => o.agentId === flipper.id);
    expect(mySell).toBeDefined();
    const breakEven = Math.ceil(101 / 0.98); // 104
    expect(mySell!.price).toBe(breakEven);
    checkInvariants(state);
  });

  it('stale positions cut the loss at market price', () => {
    const state = emptyWorld();
    const rng = createRng(7);
    const seller = addAgent(state, 'player', 10_000, { ore: 50 });
    const flipper = addAgent(state, 'player', 50_000, { ore: 10 });
    placeOrder(state, seller, 'ore', 'sell', 90, 5);
    flipper.memo['basis_ore'] = 100;
    flipper.memo['since_ore'] = 0;
    state.tick = TUNING.player.staleHoldTicks + 100; // held way too long
    alignTick(state, flipper.id, TUNING.player.cadence);
    actAgent(state, flipper, rng);
    const mySell = state.books['ore']!.sells.find((o) => o.agentId === flipper.id);
    expect(mySell).toBeDefined();
    expect(mySell!.price).toBe(89); // undercuts the 90 ask, ignoring basis
    checkInvariants(state);
  });

  it('clears basis after a full exit', () => {
    const state = emptyWorld();
    const rng = createRng(7);
    const flipper = addAgent(state, 'player', 50_000, {});
    flipper.memo['basis_ore'] = 100;
    flipper.memo['since_ore'] = 0;
    alignTick(state, flipper.id, TUNING.player.cadence);
    actAgent(state, flipper, rng); // holds nothing, no orders → position exited
    expect(flipper.memo['basis_ore']).toBeUndefined();
    expect(flipper.memo['since_ore']).toBeUndefined();
  });

  it('clears orphaned basis when the only open order was a cancelled buy', () => {
    const state = emptyWorld();
    const rng = createRng(7);
    const seller = addAgent(state, 'player', 10_000, { ore: 50 });
    placeOrder(state, seller, 'ore', 'sell', 200, 5); // one-sided book: no bids
    const flipper = addAgent(state, 'player', 50_000, {});
    applyCommand(state, flipper.id, { type: 'place', itemId: 'ore', side: 'buy', price: 50, qty: 2 });
    flipper.memo['basis_ore'] = 50;
    flipper.memo['since_ore'] = 0;
    alignTick(state, flipper.id, TUNING.player.cadence);
    actAgent(state, flipper, rng);
    // The buy was cancelled at act start and nothing is held → fully exited.
    expect(flipper.memo['basis_ore']).toBeUndefined();
    expect(flipper.memo['since_ore']).toBeUndefined();
    checkInvariants(state);
  });

  it('blends basis to a weighted average when topping up an unlisted position', () => {
    const TWO: ItemDef[] = [
      { id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.1 },
      { id: 'log', name: 'Log', baseCost: 200, consumeValue: 450, volatility: 0.1 },
    ];
    const state = createWorld({
      seed: 1,
      items: TWO,
      producersPerItem: 0,
      consumersPerItem: 0,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    const rng = createRng(7);
    const mm = addAgent(state, 'player', 100_000, { ore: 50 });
    placeOrder(state, mm, 'ore', 'buy', 80, 5);
    placeOrder(state, mm, 'ore', 'sell', 120, 5);
    const flipper = addAgent(state, 'player', 100_000, { ore: 5, log: 3 });
    // Fill all 3 slots with log sells so ore stays unlisted at requote time.
    for (let i = 0; i < 3; i++) placeOrder(state, flipper, 'log', 'sell', 10_000 + i, 1);
    flipper.memo['basis_ore'] = 100;
    flipper.memo['since_ore'] = 0;
    alignTick(state, flipper.id, TUNING.player.cadence);
    actAgent(state, flipper, rng);
    // Top-up buy of 8 @81 against a held position of 5 @basis 100:
    // round((100*5 + 81*8) / 13) = 88. Position age must NOT reset.
    expect(flipper.memo['basis_ore']).toBe(88);
    expect(flipper.memo['since_ore']).toBe(0);
    const oreBuys = state.books['ore']!.buys.filter((o) => o.agentId === flipper.id);
    expect(oreBuys).toHaveLength(1);
    expect(oreBuys[0]!.price).toBe(81);
    checkInvariants(state);
  });

  it('uses multiple slots for concurrent flips across items', () => {
    const TWO: ItemDef[] = [
      { id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.1 },
      { id: 'log', name: 'Log', baseCost: 200, consumeValue: 450, volatility: 0.1 },
    ];
    const state = createWorld({
      seed: 1,
      items: TWO,
      producersPerItem: 0,
      consumersPerItem: 0,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    const rng = createRng(7);
    const mm = addAgent(state, 'player', 100_000, { ore: 50, log: 50 });
    // Wide two-sided books on both items.
    applyCommand(state, mm.id, { type: 'place', itemId: 'ore', side: 'buy', price: 80, qty: 5 });
    applyCommand(state, mm.id, { type: 'place', itemId: 'ore', side: 'sell', price: 120, qty: 5 });
    placeOrder(state, mm, 'log', 'buy', 200, 5); // bypass mm's 3-slot limit for fixture setup
    placeOrder(state, mm, 'log', 'sell', 300, 5);
    const flipper = addAgent(state, 'player', 100_000, {});
    alignTick(state, flipper.id, TUNING.player.cadence);
    actAgent(state, flipper, rng);
    const myBuys = [
      ...state.books['ore']!.buys.filter((o) => o.agentId === flipper.id),
      ...state.books['log']!.buys.filter((o) => o.agentId === flipper.id),
    ];
    expect(myBuys).toHaveLength(2); // one flip bid per item
    expect(flipper.memo['basis_ore']).toBe(81);
    expect(flipper.memo['basis_log']).toBe(201);
    checkInvariants(state);
  });
});
