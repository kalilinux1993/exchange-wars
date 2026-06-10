import { describe, expect, it } from 'vitest';
import { applyCommand, countOpenOrders, playerView, PROGRESSION } from '../src/engine/commands';
import { placeOrder } from '../src/engine/exchange';
import { checkInvariants } from '../src/engine/invariants';
import { addAgent, createWorld } from '../src/engine/sim';
import type { AgentState, ItemDef, WorldState } from '../src/engine/types';

const ORE: ItemDef = { id: 'ore', name: 'Ore', baseCost: 80, consumeValue: 200, volatility: 0.1 };

function fixture(): { state: WorldState; alice: AgentState; bob: AgentState } {
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
  const alice = addAgent(state, 'player', 10_000, {});
  const bob = addAgent(state, 'player', 10_000, { ore: 100 });
  return { state, alice, bob };
}

describe('command protocol', () => {
  it('enforces the offer slot limit on place', () => {
    const { state, alice } = fixture();
    expect(alice.slots).toBe(PROGRESSION.startingSlots);
    for (const price of [10, 11, 12]) {
      const r = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price, qty: 1 });
      expect(r.ok).toBe(true);
    }
    const r4 = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 13, qty: 1 });
    expect(r4.ok).toBe(false);
    expect(r4.reason).toBe('no-free-slots');
    checkInvariants(state);
  });

  it('cancel frees slots', () => {
    const { state, alice } = fixture();
    for (const price of [10, 11, 12]) {
      applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price, qty: 1 });
    }
    applyCommand(state, alice.id, { type: 'cancel', side: 'buy' });
    expect(countOpenOrders(state, alice.id)).toBe(0);
    const r = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 10, qty: 1 });
    expect(r.ok).toBe(true);
    expect(alice.gp).toBe(10_000 - 10);
    checkInvariants(state);
  });

  it('fully-filled offers do not occupy a slot afterwards', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, bob, 'ore', 'sell', 100, 10); // counterparty, engine-internal
    const r = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 100, qty: 10 });
    expect(r.ok).toBe(true);
    expect(r.trades).toHaveLength(1);
    expect(countOpenOrders(state, alice.id)).toBe(0);
    for (const price of [10, 11, 12]) {
      const rr = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price, qty: 1 });
      expect(rr.ok).toBe(true);
    }
    checkInvariants(state);
  });

  it('buySlot walks the cost schedule, burns gp via the ledger, and stops at max', () => {
    const { state } = fixture();
    const carol = addAgent(state, 'player', 3_000_000, {});
    const burnedBefore = state.ledger.gpBurned;
    const totalCost = PROGRESSION.slotCosts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < PROGRESSION.slotCosts.length; i++) {
      const r = applyCommand(state, carol.id, { type: 'buySlot' });
      expect(r.ok).toBe(true);
    }
    expect(carol.slots).toBe(PROGRESSION.maxSlots);
    expect(carol.gp).toBe(3_000_000 - totalCost);
    expect(state.ledger.gpBurned - burnedBefore).toBe(totalCost);
    const rMax = applyCommand(state, carol.id, { type: 'buySlot' });
    expect(rMax.ok).toBe(false);
    expect(rMax.reason).toBe('max-slots');
    checkInvariants(state);
  });

  it('rejects buySlot the player cannot afford', () => {
    const { state, alice } = fixture();
    const r = applyCommand(state, alice.id, { type: 'buySlot' }); // 10k < 25k
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('insufficient-gp');
    expect(alice.slots).toBe(PROGRESSION.startingSlots);
    expect(alice.gp).toBe(10_000);
  });

  it('rejects non-players and unknown ids', () => {
    const { state } = fixture();
    const npc = addAgent(state, 'noise', 5_000, {});
    const r1 = applyCommand(state, npc.id, { type: 'place', itemId: 'ore', side: 'buy', price: 10, qty: 1 });
    expect(r1.reason).toBe('not-a-player');
    const r2 = applyCommand(state, 999, { type: 'buySlot' });
    expect(r2.reason).toBe('unknown-player');
    expect(playerView(state, npc.id)).toBeNull();
    expect(playerView(state, 999)).toBeNull();
  });

  it('passes underlying validation through (with stats)', () => {
    const { state, alice } = fixture();
    const r = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 0, qty: 1 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('bad-price');
    expect(state.stats.ordersRejected).toBe(1);
  });

  it('playerView reflects orders, ownership flags, and round-trips through JSON', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, bob, 'ore', 'sell', 100, 5);
    applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 50, qty: 2 });
    const view = playerView(state, alice.id);
    expect(view).not.toBeNull();
    expect(view!.slots).toBe(PROGRESSION.startingSlots);
    expect(view!.nextSlotCost).toBe(PROGRESSION.slotCosts[0]);
    expect(view!.openOrders).toEqual([
      { id: expect.any(Number), itemId: 'ore', side: 'buy', price: 50, remaining: 2 },
    ]);
    const m = view!.markets[0]!;
    expect(m.bestBid).toBe(50);
    expect(m.bestBidIsMine).toBe(true);
    expect(m.bestAsk).toBe(100);
    expect(m.bestAskIsMine).toBe(false);
    expect(JSON.parse(JSON.stringify(view))).toEqual(view);
  });

  it('conserves through a command-driven session', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, bob, 'ore', 'sell', 100, 20);
    applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 100, qty: 5 });
    applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'sell', price: 120, qty: 3 });
    applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 90, qty: 4 });
    applyCommand(state, alice.id, { type: 'cancel', itemId: 'ore', side: 'buy' });
    checkInvariants(state);
  });
});
