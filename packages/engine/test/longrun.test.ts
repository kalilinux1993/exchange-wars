import { describe, expect, it } from 'vitest';
import { hashState } from '../src/hash';
import { checkInvariants } from '../src/invariants';
import { netWorth } from '../src/report';
import { createWorld, runTicks } from '../src/sim';
import type { WorldState } from '../src/types';

// Offline accrual = save, fast-forward, resume. These gates prove long runs
// stay conserved, anchored, and cheap (50k ticks ≈ 250ms; vitest's timeout
// would flag a perf regression of >10x).
describe('long run / offline accrual', () => {
  it('50k ticks: conserved every 10k, anchored, flipper still profitable', () => {
    const state = createWorld({ seed: 42 });
    for (let i = 0; i < 5; i++) {
      runTicks(state, 10_000);
      checkInvariants(state);
    }
    for (const def of state.items) {
      const book = state.books[def.id]!;
      expect(book.ema, `${def.id} ema ${book.ema} below floor band`).toBeGreaterThan(def.baseCost * 0.5);
      expect(book.ema, `${def.id} ema ${book.ema} above ceiling band`).toBeLessThan(def.consumeValue * 1.3);
      expect(book.volume, `${def.id} volume dried up`).toBeGreaterThan(10_000);
    }
    const player = state.agents.find((a) => a.kind === 'player')!;
    expect(netWorth(state, player)).toBeGreaterThan(player.memo['startGp'] ?? 0);
  });

  it('resumes from a mid-run snapshot identically (25k saved + 25k == straight 50k)', () => {
    const straight = createWorld({ seed: 7 });
    runTicks(straight, 50_000);
    const live = createWorld({ seed: 7 });
    runTicks(live, 25_000);
    const restored = JSON.parse(JSON.stringify(live)) as WorldState; // the "save file"
    runTicks(restored, 25_000);
    expect(hashState(restored)).toBe(hashState(straight));
  });
});
