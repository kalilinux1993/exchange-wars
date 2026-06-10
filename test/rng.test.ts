import { describe, expect, it } from 'vitest';
import { createRng } from '../src/engine/rng';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });

  it('differs across seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const sa = Array.from({ length: 10 }, () => a.next());
    const sb = Array.from({ length: 10 }, () => b.next());
    expect(sa).not.toEqual(sb);
  });

  it('int stays in bounds and hits both ends', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rng.int(1, 6);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen.add(v);
    }
    expect(seen.size).toBe(6);
  });

  it('resumes exactly from saved state', () => {
    const a = createRng(99);
    a.next();
    a.next();
    const b = createRng(a.state());
    for (let i = 0; i < 50; i++) expect(b.next()).toBe(a.next());
  });

  it('has roughly uniform mean', () => {
    const rng = createRng(123);
    let sum = 0;
    for (let i = 0; i < 10_000; i++) sum += rng.next();
    const mean = sum / 10_000;
    expect(mean).toBeGreaterThan(0.47);
    expect(mean).toBeLessThan(0.53);
  });
});
