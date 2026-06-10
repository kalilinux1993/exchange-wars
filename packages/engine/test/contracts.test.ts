import { describe, expect, it } from 'vitest';
import { TUNING } from '../src/agents';
import { applyCommand, playerView } from '../src/commands';
import { placeOrder } from '../src/exchange';
import { checkInvariants } from '../src/invariants';
import { addAgent, createWorld, runTicks } from '../src/sim';
import type { ItemDef } from '../src/types';

const ORE: ItemDef = { id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.1 };

function fixture() {
  const state = createWorld({
    seed: 1,
    items: [ORE],
    producersPerItem: 0,
    consumersPerItem: 0,
    marketMakersPerItem: 0,
    momentumTraders: 0,
    noiseTraders: 0,
    players: 0,
  });
  const player = addAgent(state, 'player', 10_000, { ore: 50 });
  return { state, player };
}

describe('quartermaster contracts', () => {
  it('fulfills a contract: items burned, premium minted, contract removed', () => {
    const { state, player } = fixture();
    state.contracts!.push({ id: 7, itemId: 'ore', qty: 20, unitPrice: 150, expiresTick: 1_000 });
    const res = applyCommand(state, player.id, { type: 'fulfillContract', contractId: 7 });
    expect(res.ok).toBe(true);
    expect(player.inventory['ore']).toBe(30);
    expect(player.gp).toBe(10_000 + 20 * 150);
    expect(state.ledger.itemsBurned['ore']).toBe(20);
    expect(state.ledger.gpMinted).toBe(3_000);
    expect(state.contracts).toHaveLength(0);
    expect(state.stats.contractsFilled).toBe(1);
    checkInvariants(state);
  });

  it('rejects unknown, expired, and under-stocked deliveries', () => {
    const { state, player } = fixture();
    state.contracts!.push({ id: 1, itemId: 'ore', qty: 20, unitPrice: 150, expiresTick: 1_000 });
    expect(applyCommand(state, player.id, { type: 'fulfillContract', contractId: 99 }).reason).toBe(
      'unknown-contract',
    );
    state.tick = 1_000; // at/after expiry
    expect(applyCommand(state, player.id, { type: 'fulfillContract', contractId: 1 }).reason).toBe(
      'contract-expired',
    );
    state.tick = 0;
    state.contracts!.push({ id: 2, itemId: 'ore', qty: 45, unitPrice: 150, expiresTick: 1_000 });
    // Lock 10 in a sell — escrowed items must NOT count toward the 45.
    placeOrder(state, player, 'ore', 'sell', 500, 10);
    expect(player.inventory['ore']).toBe(40);
    expect(applyCommand(state, player.id, { type: 'fulfillContract', contractId: 2 }).reason).toBe(
      'insufficient-items',
    );
    checkInvariants(state);
  });

  it('spawns within bounds, caps open contracts, and prunes expired ones', () => {
    const state = createWorld({ seed: 42 });
    runTicks(state, 6_000);
    const contracts = state.contracts!;
    expect(contracts.length).toBeLessThanOrEqual(TUNING.contracts.maxOpen);
    const view = playerView(state, state.agents.find((a) => a.kind === 'player')!.id)!;
    for (const c of view.contracts) {
      expect(c.qty).toBeGreaterThanOrEqual(2);
      expect(c.qty).toBeLessThanOrEqual(80);
      expect(c.unitPrice).toBeGreaterThanOrEqual(1);
      expect(c.expiresTick).toBeGreaterThan(state.tick);
    }
    // Determinism piggyback: same seed reproduces the same contract ids.
    const state2 = createWorld({ seed: 42 });
    runTicks(state2, 6_000);
    expect(state2.contracts).toEqual(state.contracts);
    checkInvariants(state);
  });
});
