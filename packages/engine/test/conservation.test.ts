import { describe, expect, it } from 'vitest';
import { checkInvariants } from '../src/invariants';
import { createWorld, runTicks } from '../src/sim';

describe('conservation', () => {
  it('gp and item ledgers balance through a 4000-tick run (checked every 500)', () => {
    const state = createWorld({ seed: 11 });
    for (let i = 0; i < 8; i++) {
      runTicks(state, 500);
      expect(() => checkInvariants(state)).not.toThrow();
    }
  });

  it('holds across a spread of seeds', () => {
    for (const seed of [1, 2, 3, 99, 12345]) {
      const state = createWorld({ seed });
      runTicks(state, 1000);
      expect(() => checkInvariants(state), `seed ${seed}`).not.toThrow();
    }
  });
});
