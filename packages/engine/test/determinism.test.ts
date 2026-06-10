import { describe, expect, it } from 'vitest';
import { hashState } from '../src/hash';
import { createWorld, runTicks } from '../src/sim';
import type { WorldState } from '../src/types';

describe('determinism', () => {
  it('same seed, same history -> identical state hash', () => {
    const a = createWorld({ seed: 42 });
    runTicks(a, 1500);
    const b = createWorld({ seed: 42 });
    runTicks(b, 1500);
    expect(hashState(a)).toBe(hashState(b));
  });

  it('different seed -> different hash', () => {
    const a = createWorld({ seed: 42 });
    runTicks(a, 500);
    const b = createWorld({ seed: 43 });
    runTicks(b, 500);
    expect(hashState(a)).not.toBe(hashState(b));
  });

  it('JSON snapshot/restore mid-run continues identically', () => {
    const live = createWorld({ seed: 7 });
    runTicks(live, 1000);
    const restored = JSON.parse(JSON.stringify(live)) as WorldState;
    expect(hashState(restored)).toBe(hashState(live)); // round-trip is lossless
    runTicks(live, 500);
    runTicks(restored, 500);
    expect(hashState(restored)).toBe(hashState(live)); // and resumes exactly
  });
});
