import { describe, expect, it } from 'vitest';
import { activeEvent, TUNING } from '../src/agents';
import { checkInvariants } from '../src/invariants';
import { createWorld, runTicks } from '../src/sim';
import type { ItemDef } from '../src/types';

const ORE: ItemDef = { id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.1 };

describe('world events', () => {
  it('supply shock halts production for the window, then it resumes', () => {
    const state = createWorld({
      seed: 1,
      items: [ORE],
      producersPerItem: 1,
      consumersPerItem: 0,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    state.events!.push({ id: 'test_shock', itemId: 'ore', kind: 'supply_shock', startTick: 0, endTick: 600 });
    runTicks(state, 240); // spawner can't fire before tick 250 — window is pure
    expect(state.ledger.itemsMinted['ore'] ?? 0).toBe(0); // strike held
    const state2 = createWorld({
      seed: 1,
      items: [ORE],
      producersPerItem: 1,
      consumersPerItem: 0,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    runTicks(state2, 240);
    expect(state2.ledger.itemsMinted['ore'] ?? 0).toBeGreaterThan(0); // baseline produces
    checkInvariants(state);
  });

  it('demand surge raises the minted wage by exactly 1.5x', () => {
    const state = createWorld({
      seed: 1,
      items: [ORE],
      producersPerItem: 0,
      consumersPerItem: 1,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    state.events!.push({ id: 'test_surge', itemId: 'ore', kind: 'demand_surge', startTick: 0, endTick: 600 });
    runTicks(state, 50); // consumer id 0, cadence 5 → 10 acts
    const surgedWage = Math.ceil(ORE.consumeValue * TUNING.consumer.wageFactor * 1.5);
    expect(state.ledger.gpMinted).toBe(10 * surgedWage);
    checkInvariants(state);
  });

  it('spawns and prunes events deterministically over a long run', () => {
    const state = createWorld({ seed: 42 });
    runTicks(state, 5000);
    expect(state.stats.eventsSpawned).toBeGreaterThan(0);
    for (const e of state.events!) {
      expect(e.endTick).toBeGreaterThan(e.startTick);
      expect(e.endTick).toBeGreaterThan(state.tick - TUNING.events.checkEvery - 1); // pruned on checks
    }
    // No two simultaneous events on one item.
    const active = state.events!.filter((e) => e.endTick > state.tick);
    const ids = active.map((e) => e.itemId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(activeEvent(state, 'nonexistent')).toBeUndefined();
    checkInvariants(state);
  });
});
