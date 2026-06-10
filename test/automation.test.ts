import { describe, expect, it } from 'vitest';
import { actAgent, TUNING } from '../src/engine/agents';
import { applyCommand, countOpenOrders, PROGRESSION } from '../src/engine/commands';
import { placeOrder } from '../src/engine/exchange';
import { hashState } from '../src/engine/hash';
import { checkInvariants } from '../src/engine/invariants';
import { netWorth } from '../src/engine/report';
import { createRng } from '../src/engine/rng';
import { addAgent, createWorld, runTicks } from '../src/engine/sim';
import type { ItemDef, WorldState } from '../src/engine/types';

function alignTick(state: WorldState, agentId: number, cadence: number): void {
  while ((state.tick + agentId) % cadence !== 0) state.tick++;
}

describe('automation upgrades', () => {
  it('buyUpgrade walks the tier costs, burns gp, and stops at max tier', () => {
    const state = createWorld({ seed: 1 });
    const player = addAgent(state, 'player', 700_000, {});
    const burnedBefore = state.ledger.gpBurned;
    const costs = PROGRESSION.upgrades.autoFlip.costs;
    for (let i = 0; i < costs.length; i++) {
      const r = applyCommand(state, player.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
      expect(r.ok).toBe(true);
      expect(player.upgrades?.['autoFlip']).toBe(i + 1);
    }
    const total = costs.reduce((a, b) => a + b, 0);
    expect(player.gp).toBe(700_000 - total);
    expect(state.ledger.gpBurned - burnedBefore).toBe(total);
    expect(applyCommand(state, player.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' }).reason).toBe('max-tier');
    expect(applyCommand(state, player.id, { type: 'buyUpgrade', upgradeId: 'autoMiner' }).reason).toBe('unknown-upgrade');
    // Prototype-chain keys must be rejected, not throw mid-tick.
    expect(applyCommand(state, player.id, { type: 'buyUpgrade', upgradeId: '__proto__' }).reason).toBe('unknown-upgrade');
    expect(applyCommand(state, player.id, { type: 'buyUpgrade', upgradeId: 'constructor' }).reason).toBe('unknown-upgrade');
    checkInvariants(state);
  });

  it('upgrades survive a WorldState JSON round-trip with identical hash', () => {
    const state = createWorld({ seed: 1 });
    const player = addAgent(state, 'player', 700_000, {});
    applyCommand(state, player.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
    const restored = JSON.parse(JSON.stringify(state)) as WorldState;
    expect(hashState(restored)).toBe(hashState(state));
    expect(restored.agents[player.id]!.upgrades?.['autoFlip']).toBe(1);
    expect(restored.agents[player.id]!.policy).toBe('scripted-flipper');
  });

  it('rejects an unaffordable upgrade', () => {
    const state = createWorld({ seed: 1 });
    const poor = addAgent(state, 'player', 1_000, {});
    const r = applyCommand(state, poor.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('insufficient-gp');
    expect(poor.upgrades?.['autoFlip']).toBeUndefined();
  });

  it('a tier-0 idle player is completely inert', () => {
    const state = createWorld({ seed: 5 });
    const idle = addAgent(state, 'player', 100_000, {});
    idle.policy = 'idle';
    runTicks(state, 200);
    expect(idle.gp).toBe(100_000);
    expect(countOpenOrders(state, idle.id)).toBe(0);
    checkInvariants(state);
  });

  it('IDLE GATE: a tier-1 idle player profits hands-free over 6000 ticks', () => {
    const state = createWorld({ seed: 42 });
    const idle = addAgent(state, 'player', 200_000, {});
    idle.policy = 'idle';
    const r = applyCommand(state, idle.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
    expect(r.ok).toBe(true);
    const workingCapital = 200_000 - PROGRESSION.upgrades.autoFlip.costs[0]!;
    runTicks(state, 6000); // zero further input — engine automation only
    expect(netWorth(state, idle), 'idle automation failed to profit').toBeGreaterThan(workingCapital);
    // The manageSlots:false contract: automation never self-funds unlocks.
    expect(idle.slots).toBe(PROGRESSION.startingSlots);
    expect(idle.upgrades?.['autoFlip']).toBe(1);
    checkInvariants(state);
  });

  it('tier 1 caps automation at one concurrent flip', () => {
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
    placeOrder(state, mm, 'ore', 'buy', 80, 5);
    placeOrder(state, mm, 'ore', 'sell', 120, 5);
    placeOrder(state, mm, 'log', 'buy', 200, 5);
    placeOrder(state, mm, 'log', 'sell', 300, 5);
    const idle = addAgent(state, 'player', 200_000, {});
    idle.policy = 'idle';
    applyCommand(state, idle.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
    alignTick(state, idle.id, TUNING.automation.autoFlip[0]!.cadence);
    actAgent(state, idle, rng);
    const myBuys = [
      ...state.books['ore']!.buys.filter((o) => o.agentId === idle.id),
      ...state.books['log']!.buys.filter((o) => o.agentId === idle.id),
    ];
    expect(myBuys).toHaveLength(1); // tier 1 = single concurrent flip
    expect(myBuys[0]!.itemId).toBe('log'); // higher-profit candidate wins
    checkInvariants(state);
  });

  it('tier 2 runs two concurrent flips on its faster cadence', () => {
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
    placeOrder(state, mm, 'ore', 'buy', 80, 5);
    placeOrder(state, mm, 'ore', 'sell', 120, 5);
    placeOrder(state, mm, 'log', 'buy', 200, 5);
    placeOrder(state, mm, 'log', 'sell', 300, 5);
    const idle = addAgent(state, 'player', 500_000, {});
    idle.policy = 'idle';
    applyCommand(state, idle.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
    applyCommand(state, idle.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
    expect(idle.upgrades?.['autoFlip']).toBe(2);
    alignTick(state, idle.id, TUNING.automation.autoFlip[1]!.cadence);
    actAgent(state, idle, rng);
    const myBuys = [
      ...state.books['ore']!.buys.filter((o) => o.agentId === idle.id),
      ...state.books['log']!.buys.filter((o) => o.agentId === idle.id),
    ];
    expect(myBuys).toHaveLength(2); // tier 2 = two concurrent flips
    checkInvariants(state);
  });
});
