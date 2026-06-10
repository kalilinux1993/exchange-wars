import { describe, expect, it } from 'vitest';
import { netWorth } from '../src/report';
import { createWorld, runTicks } from '../src/sim';

// Economy sanity: with cost-anchored producers and value-anchored consumers,
// prices must stay in a sane band and the scripted flipper must stay solvent.
// Deterministic per seed — if these pass once, they pass forever.
const SEEDS = [11, 42, 1337];

describe('market sanity', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: prices anchored, volume flows, flipper solvent`, () => {
      const state = createWorld({ seed });
      runTicks(state, 6000);
      for (const def of state.items) {
        const book = state.books[def.id]!;
        expect(book.ema, `${def.id} ema ${book.ema} below floor band`).toBeGreaterThan(def.baseCost * 0.5);
        expect(book.ema, `${def.id} ema ${book.ema} above ceiling band`).toBeLessThan(def.consumeValue * 1.3);
        expect(book.volume, `${def.id} has no volume`).toBeGreaterThan(50);
      }
      expect(state.stats.tradesTotal).toBeGreaterThan(500);
      const player = state.agents.find((a) => a.kind === 'player');
      expect(player).toBeDefined();
      const start = player!.memo['startGp'] ?? 0;
      expect(netWorth(state, player!), 'flipper failed to turn a profit').toBeGreaterThan(start);
    });
  }
});
