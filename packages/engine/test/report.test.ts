import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/commands';
import { netWorth } from '../src/report';
import { addAgent, createWorld } from '../src/sim';
import type { WorldState } from '../src/types';

/** Tiny two-player world: a holder with a stack, a bidder with cash. */
function fixture(): { state: WorldState; holder: number; bidder: number } {
  const state = createWorld({
    seed: 1,
    items: [{ id: 'blood_rune', name: 'Blood rune', baseCost: 227, consumeValue: 455, volatility: 0.09 }],
    producersPerItem: 0,
    consumersPerItem: 0,
    marketMakersPerItem: 0,
    momentumTraders: 0,
    noiseTraders: 0,
    players: 0,
  });
  const a = addAgent(state, 'player', 10_000, { blood_rune: 10 });
  a.policy = 'idle';
  const b = addAgent(state, 'player', 10_000, {});
  b.policy = 'idle';
  return { state, holder: a.id, bidder: b.id };
}

describe('netWorth — the honest (liquidation) mark', () => {
  it('marks a stack at what the resting bids would actually pay; remainder is 0', () => {
    const { state, holder, bidder } = fixture();
    const a = state.agents[holder]!;
    expect(netWorth(state, a)).toBe(10_000); // no bids anywhere: the stack is unsellable right now
    expect(applyCommand(state, bidder, { type: 'place', itemId: 'blood_rune', side: 'buy', price: 100, qty: 5 }).ok).toBe(true);
    expect(applyCommand(state, bidder, { type: 'place', itemId: 'blood_rune', side: 'buy', price: 90, qty: 3 }).ok).toBe(true);
    // 10 held: 5 sell into the 100s, 3 into the 90s, 2 find no buyer.
    expect(netWorth(state, a)).toBe(10_000 + 5 * 100 + 3 * 90);
    // lastPrice is NOT the mark — pump it and nothing changes.
    state.books['blood_rune']!.lastPrice = 99_999;
    expect(netWorth(state, a)).toBe(10_000 + 5 * 100 + 3 * 90);
  });

  it('ignores the agent\'s own bids — self-bidding cannot pump your own mark', () => {
    const { state, holder, bidder } = fixture();
    const a = state.agents[holder]!;
    expect(applyCommand(state, bidder, { type: 'place', itemId: 'blood_rune', side: 'buy', price: 100, qty: 5 }).ok).toBe(true);
    const before = netWorth(state, a);
    // The holder bids 1,000 on the item they hold 10 of. If the mark counted
    // it, the stack would jump ~10k for free (escrow is refundable cash).
    expect(applyCommand(state, holder, { type: 'place', itemId: 'blood_rune', side: 'buy', price: 1_000, qty: 4 }).ok).toBe(true);
    expect(netWorth(state, a)).toBe(before); // cash became escrow; the stack still marks vs OTHERS' bids
    const b = state.agents[bidder]!;
    expect(netWorth(state, b)).toBe(10_000); // bidder: cash + own escrow, no holdings
  });

  it('sell-escrowed units join the stack for marking', () => {
    const { state, holder, bidder } = fixture();
    const a = state.agents[holder]!;
    expect(applyCommand(state, bidder, { type: 'place', itemId: 'blood_rune', side: 'buy', price: 100, qty: 5 }).ok).toBe(true);
    const before = netWorth(state, a);
    // Resting a high sell moves 4 units to escrow — worth must not change.
    expect(applyCommand(state, holder, { type: 'place', itemId: 'blood_rune', side: 'sell', price: 5_000, qty: 4 }).ok).toBe(true);
    expect(netWorth(state, a)).toBe(before);
  });
});
