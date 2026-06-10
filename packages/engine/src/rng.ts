// Deterministic RNG (mulberry32). All engine randomness flows through this —
// never Math.random()/Date.now() inside src/engine (enforced by test/purity.test.ts).

export interface RNG {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
  /** Internal 32-bit state — stored in WorldState so runs resume exactly. */
  state(): number;
}

export function createRng(seed: number): RNG {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min: number, max: number): number {
      if (max < min) throw new Error(`rng.int: max < min (${min}, ${max})`);
      return min + Math.floor(next() * (max - min + 1));
    },
    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) throw new Error('rng.pick: empty array');
      return arr[Math.floor(next() * arr.length)] as T;
    },
    chance(p: number): boolean {
      return next() < p;
    },
    state(): number {
      return s;
    },
  };
}

/** FNV-1a 32-bit hash. */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
