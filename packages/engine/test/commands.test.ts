import { describe, expect, it } from 'vitest';
import { applyCommand, countOpenOrders, playerView, PROGRESSION } from '../src/commands';
import { placeOrder } from '../src/exchange';
import { hashState } from '../src/hash';
import { checkInvariants } from '../src/invariants';
import { addAgent, createWorld } from '../src/sim';
import type { AgentState, ItemDef, WorldState } from '../src/types';

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

  it('a partial fill rests as exactly one occupied slot', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, bob, 'ore', 'sell', 100, 4);
    const r = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 100, qty: 10 });
    expect(r.ok).toBe(true);
    expect(r.trades).toHaveLength(1); // 4 filled, 6 rest
    expect(countOpenOrders(state, alice.id)).toBe(1);
    applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 10, qty: 1 });
    applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 11, qty: 1 });
    const r4 = applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 12, qty: 1 });
    expect(r4.reason).toBe('no-free-slots');
    checkInvariants(state);
  });

  it('upgraded slots survive a WorldState JSON round-trip and stay enforced', () => {
    const { state } = fixture();
    const carol = addAgent(state, 'player', 200_000, {});
    applyCommand(state, carol.id, { type: 'buySlot' });
    expect(carol.slots).toBe(PROGRESSION.startingSlots + 1);
    const restored = JSON.parse(JSON.stringify(state)) as WorldState;
    expect(hashState(restored)).toBe(hashState(state));
    expect(restored.agents[carol.id]!.slots).toBe(PROGRESSION.startingSlots + 1);
    for (const price of [10, 11, 12, 13]) {
      const r = applyCommand(restored, carol.id, { type: 'place', itemId: 'ore', side: 'buy', price, qty: 1 });
      expect(r.ok).toBe(true);
    }
    const over = applyCommand(restored, carol.id, { type: 'place', itemId: 'ore', side: 'buy', price: 14, qty: 1 });
    expect(over.reason).toBe('no-free-slots');
    checkInvariants(restored);
  });

  it('buySlot interleaved with live orders keeps the ledger exact', () => {
    const { state, alice, bob } = fixture();
    const carol = addAgent(state, 'player', 300_000, { ore: 10 });
    applyCommand(state, carol.id, { type: 'place', itemId: 'ore', side: 'sell', price: 150, qty: 5 });
    applyCommand(state, carol.id, { type: 'place', itemId: 'ore', side: 'buy', price: 50, qty: 2 });
    applyCommand(state, carol.id, { type: 'buySlot' }); // burn while orders rest
    placeOrder(state, bob, 'ore', 'sell', 50, 2); // fills carol's bid
    applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 150, qty: 5 }); // fills carol's ask
    applyCommand(state, carol.id, { type: 'buySlot' });
    applyCommand(state, carol.id, { type: 'cancel' });
    expect(carol.slots).toBe(PROGRESSION.startingSlots + 2);
    checkInvariants(state);
  });

  it('enforces GE buy limits per rolling window, counted at placement', () => {
    const LIMITED: ItemDef = { id: 'whip', name: 'Whip', baseCost: 100, consumeValue: 250, volatility: 0.1, buyLimit: 8 };
    const state = createWorld({
      seed: 1,
      items: [LIMITED],
      producersPerItem: 0,
      consumersPerItem: 0,
      marketMakersPerItem: 0,
      momentumTraders: 0,
      noiseTraders: 0,
      players: 0,
    });
    const alice = addAgent(state, 'player', 50_000, {});
    expect(playerView(state, alice.id)!.markets[0]!.buyRemaining).toBe(8);
    expect(applyCommand(state, alice.id, { type: 'place', itemId: 'whip', side: 'buy', price: 10, qty: 5 }).ok).toBe(true);
    expect(playerView(state, alice.id)!.markets[0]!.buyRemaining).toBe(3);
    // Over the remaining allowance → rejected before any escrow moves.
    const over = applyCommand(state, alice.id, { type: 'place', itemId: 'whip', side: 'buy', price: 10, qty: 4 });
    expect(over.reason).toBe('buy-limit');
    // Cancelling does NOT refund the allowance (placement-counted).
    applyCommand(state, alice.id, { type: 'cancel' });
    expect(playerView(state, alice.id)!.markets[0]!.buyRemaining).toBe(3);
    expect(applyCommand(state, alice.id, { type: 'place', itemId: 'whip', side: 'buy', price: 10, qty: 3 }).ok).toBe(true);
    expect(playerView(state, alice.id)!.markets[0]!.buyRemaining).toBe(0);
    // Window expiry restores the full allowance.
    state.tick += 4_000;
    expect(playerView(state, alice.id)!.markets[0]!.buyRemaining).toBe(8);
    expect(applyCommand(state, alice.id, { type: 'place', itemId: 'whip', side: 'buy', price: 10, qty: 8 }).ok).toBe(true);
    checkInvariants(state);
  });

  it('items without a buy limit are unlimited', () => {
    const { state, alice } = fixture(); // ORE has no buyLimit field
    expect(playerView(state, alice.id)!.markets[0]!.buyRemaining).toBeNull();
    expect(applyCommand(state, alice.id, { type: 'place', itemId: 'ore', side: 'buy', price: 10, qty: 500 }).ok).toBe(true);
    checkInvariants(state);
  });

  it('configureBot clamps values, validates the focus item, and surfaces in the view', () => {
    const { state, alice } = fixture();
    expect(applyCommand(state, alice.id, { type: 'configureBot', capitalFraction: 0.9 }).ok).toBe(true);
    expect(alice.botConfig?.capitalFraction).toBe(0.5); // clamped down
    applyCommand(state, alice.id, { type: 'configureBot', capitalFraction: 0.01 });
    expect(alice.botConfig?.capitalFraction).toBe(0.1); // clamped up
    applyCommand(state, alice.id, { type: 'configureBot', maxVolatility: 5 });
    expect(alice.botConfig?.maxVolatility).toBe(1);
    expect(applyCommand(state, alice.id, { type: 'configureBot', maxVolatility: Number.NaN }).reason).toBe(
      'bad-config',
    );
    expect(applyCommand(state, alice.id, { type: 'configureBot', focusItemId: 'nonexistent' }).reason).toBe(
      'unknown-item',
    );
    applyCommand(state, alice.id, { type: 'configureBot', focusItemId: 'ore' });
    expect(alice.botConfig?.focusItemId).toBe('ore');
    applyCommand(state, alice.id, { type: 'configureBot', focusItemId: null });
    expect(alice.botConfig?.focusItemId).toBeNull();
    const view = playerView(state, alice.id)!;
    expect(view.botConfig).toEqual({ maxVolatility: 1, capitalFraction: 0.1, focusItemId: null });
    const restored = JSON.parse(JSON.stringify(state)) as WorldState;
    expect(restored.agents[alice.id]!.botConfig?.capitalFraction).toBe(0.1);
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
