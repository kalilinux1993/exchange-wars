import { describe, expect, it } from 'vitest';
import { cancelAgentOrders, MAX_RESTING_PER_AGENT_BOOK, placeOrder } from '../src/exchange';
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

describe('order matching', () => {
  it('matches at the resting price and taxes the seller', () => {
    const { state, alice, bob } = fixture();
    const sell = placeOrder(state, bob, 'ore', 'sell', 100, 10);
    expect(sell.accepted).toBe(true);
    expect(sell.trades).toHaveLength(0);

    const buy = placeOrder(state, alice, 'ore', 'buy', 120, 10);
    expect(buy.trades).toHaveLength(1);
    expect(buy.trades[0]!.price).toBe(100); // resting order sets the price
    expect(alice.gp).toBe(10_000 - 1_000);
    expect(alice.inventory['ore']).toBe(10);
    expect(bob.gp).toBe(10_000 + 1_000 - 20); // 2% tax burned
    expect(bob.inventory['ore']).toBe(90);
    expect(state.ledger.gpBurned).toBe(20);
    expect(state.books['ore']!.buys).toHaveLength(0);
    expect(state.books['ore']!.sells).toHaveLength(0);
    checkInvariants(state);
  });

  it('rests partial-fill remainder with exact gp escrow', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, bob, 'ore', 'sell', 100, 5);
    placeOrder(state, alice, 'ore', 'buy', 100, 8);
    expect(alice.inventory['ore']).toBe(5);
    expect(alice.gp).toBe(10_000 - 500 - 300); // 5 filled @100 + 3 escrowed @100
    const book = state.books['ore']!;
    expect(book.buys).toHaveLength(1);
    expect(book.buys[0]!.remaining).toBe(3);
    expect(book.buys[0]!.escrowGp).toBe(300);
    checkInvariants(state);
  });

  it('honors price-time priority', () => {
    const { state, alice, bob } = fixture();
    const carol = addAgent(state, 'player', 10_000, { ore: 50 });
    placeOrder(state, bob, 'ore', 'sell', 105, 1); // same price, earlier
    placeOrder(state, carol, 'ore', 'sell', 105, 1); // same price, later
    placeOrder(state, bob, 'ore', 'sell', 100, 1); // best price wins first
    const buy = placeOrder(state, alice, 'ore', 'buy', 110, 3);
    expect(buy.trades.map((t) => t.price)).toEqual([100, 105, 105]);
    expect(buy.trades.map((t) => t.sellerId)).toEqual([bob.id, bob.id, carol.id]);
    checkInvariants(state);
  });

  it('fills incoming sells at the resting bid price and drains its escrow exactly', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, alice, 'ore', 'buy', 150, 10); // escrow 1500
    const res = placeOrder(state, bob, 'ore', 'sell', 120, 10);
    expect(res.trades).toHaveLength(1);
    expect(res.trades[0]!.price).toBe(150);
    expect(alice.inventory['ore']).toBe(10);
    expect(alice.gp).toBe(10_000 - 1_500);
    expect(bob.gp).toBe(10_000 + 1_500 - 30);
    expect(state.books['ore']!.buys).toHaveLength(0);
    checkInvariants(state);
  });

  it('rejects unaffordable buys, oversells, and bad prices', () => {
    const { state, alice, bob } = fixture();
    const r1 = placeOrder(state, alice, 'ore', 'buy', 2_000, 10);
    expect(r1.accepted).toBe(false);
    expect(r1.reason).toBe('insufficient-gp');
    const r2 = placeOrder(state, alice, 'ore', 'sell', 100, 1);
    expect(r2.reason).toBe('insufficient-items');
    const r3 = placeOrder(state, bob, 'ore', 'sell', 0, 1);
    expect(r3.reason).toBe('bad-price');
    expect(state.stats.ordersRejected).toBe(3);
    expect(state.books['ore']!.buys).toHaveLength(0);
    expect(state.books['ore']!.sells).toHaveLength(0);
    expect(alice.gp).toBe(10_000);
    expect(bob.inventory['ore']).toBe(100);
    checkInvariants(state);
  });

  it('refunds gp escrow and items exactly on cancel', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, alice, 'ore', 'buy', 100, 5);
    placeOrder(state, bob, 'ore', 'sell', 300, 7);
    expect(alice.gp).toBe(9_500);
    expect(bob.inventory['ore']).toBe(93);
    cancelAgentOrders(state, alice);
    cancelAgentOrders(state, bob);
    expect(alice.gp).toBe(10_000);
    expect(bob.inventory['ore']).toBe(100);
    expect(state.stats.ordersCancelled).toBe(2);
    checkInvariants(state);
  });

  it('side-filtered cancel leaves the other side resting', () => {
    const { state, bob } = fixture();
    placeOrder(state, bob, 'ore', 'buy', 90, 3);
    placeOrder(state, bob, 'ore', 'sell', 200, 4);
    cancelAgentOrders(state, bob, 'ore', 'sell');
    expect(state.books['ore']!.sells).toHaveLength(0);
    expect(state.books['ore']!.buys).toHaveLength(1);
    expect(bob.inventory['ore']).toBe(100); // sell escrow refunded
    expect(bob.gp).toBe(10_000 - 270); // buy escrow still locked
    checkInvariants(state);
  });

  it('debits fills at trade price but escrows the remainder at limit price', () => {
    const { state, alice, bob } = fixture();
    placeOrder(state, bob, 'ore', 'sell', 100, 5);
    placeOrder(state, alice, 'ore', 'buy', 120, 8); // fills 5 @100, rests 3 @120
    expect(alice.inventory['ore']).toBe(5);
    expect(alice.gp).toBe(10_000 - 5 * 100 - 3 * 120);
    const book = state.books['ore']!;
    expect(book.buys).toHaveLength(1);
    expect(book.buys[0]!.escrowGp).toBe(360);
    checkInvariants(state);
  });

  it('skips own order mid-book and fills the orders behind it', () => {
    const { state, bob } = fixture();
    const dave = addAgent(state, 'player', 50_000, { ore: 10 });
    placeOrder(state, bob, 'ore', 'sell', 100, 1);
    placeOrder(state, dave, 'ore', 'sell', 105, 1); // dave's own ask, sandwiched
    placeOrder(state, bob, 'ore', 'sell', 110, 1);
    const res = placeOrder(state, dave, 'ore', 'buy', 115, 3);
    expect(res.trades.map((t) => t.price)).toEqual([100, 110]); // skipped own 105
    expect(res.trades.every((t) => t.sellerId === bob.id)).toBe(true);
    const book = state.books['ore']!;
    expect(book.sells).toHaveLength(1); // dave's 105 ask still resting
    expect(book.sells[0]!.agentId).toBe(dave.id);
    expect(book.buys).toHaveLength(1); // unfilled remainder rests
    expect(book.buys[0]!.escrowGp).toBe(115);
    expect(dave.gp).toBe(50_000 - 100 - 110 - 115);
    expect(dave.inventory['ore']).toBe(10 - 1 + 2); // 1 escrowed in ask, 2 bought
    checkInvariants(state);
  });

  it('never matches an agent against their own order', () => {
    const { state, bob } = fixture();
    placeOrder(state, bob, 'ore', 'sell', 100, 5);
    const res = placeOrder(state, bob, 'ore', 'buy', 110, 5); // would cross own ask
    expect(res.accepted).toBe(true);
    expect(res.trades).toHaveLength(0);
    expect(state.books['ore']!.buys).toHaveLength(1);
    expect(state.books['ore']!.sells).toHaveLength(1);
    checkInvariants(state);
  });
});

describe('resting-order book cap', () => {
  it('rejects the order that would exceed the per-agent book cap; cancel frees capacity', () => {
    const { state, alice } = fixture();
    for (let i = 0; i < MAX_RESTING_PER_AGENT_BOOK; i++) {
      expect(placeOrder(state, alice, 'ore', 'buy', 1 + i, 1).accepted).toBe(true);
    }
    const over = placeOrder(state, alice, 'ore', 'buy', 50, 1);
    expect(over.accepted).toBe(false);
    expect(over.reason).toBe('book-cap');
    cancelAgentOrders(state, alice, 'ore', 'buy');
    expect(placeOrder(state, alice, 'ore', 'buy', 50, 1).accepted).toBe(true);
    checkInvariants(state);
  });
});
