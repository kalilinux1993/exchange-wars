import { describe, expect, it } from 'vitest';
import { hashState } from '../src/hash';
import { checkInvariants } from '../src/invariants';
import { createRng } from '../src/rng';
import { createWorld, runTicks } from '../src/sim';

// The many-seed robustness gate (Phase-1 leftover, affordable post-6p).
// The 5 fixed gate seeds can't catch seed-SPECIFIC violations; this sweeps
// 64 seeds derived deterministically from a master seed (no flakiness) and
// asserts the two foundations on each: conservation, and that a JSON
// snapshot taken mid-run resumes bit-identically to the original world.
describe('many-seed robustness', () => {
  it('64 derived seeds: conservation holds and snapshot-resume is hash-identical', { timeout: 180_000 }, () => {
    const master = createRng(0xc0ffee);
    for (let i = 0; i < 64; i++) {
      const seed = master.int(1, 2_147_483_647);
      const world = createWorld({ seed });
      runTicks(world, 1_000);
      checkInvariants(world);
      const resumed = JSON.parse(JSON.stringify(world));
      runTicks(world, 500);
      runTicks(resumed, 500);
      expect(hashState(resumed), `seed ${seed}: snapshot-resume diverged`).toBe(hashState(world));
      checkInvariants(world);
    }
  });
});
