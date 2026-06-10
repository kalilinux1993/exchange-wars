import { describe, expect, it } from 'vitest';
import { measureIdleTier } from '../src/harness';

// The idle tier balance gate (FINDINGS #15/#16). Design notes:
// - "> 0 on every seed" kills the catastrophic-loss class of regression
//   (pre-fix tier 3 lost 4,306 gp on seed 99).
// - Tier ordering is gated by MEDIAN vs tier 1 — robust to single-seed
//   outliers (seed 42 tier 2 is a +3,104 outlier that breaks averages).
// - Tier 2 vs tier 3 ordering is intentionally ungated: they are near-tied
//   at this capital level; tier 3 buys speed, which pays under competition.
const SEEDS = [7, 11, 42, 99, 1337];
const TICKS = 8_000;

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

describe('idle tier balance gate', () => {
  for (const competitive of [false, true]) {
    const label = competitive ? 'competitive' : 'isolated';
    // 30 measured sims × 8k ticks — CI runners need real headroom (a 30s
    // budget passed locally but timed out on ubuntu at 32 items; at 84 items
    // each scenario runs ~95s locally ≈ ~190s on ubuntu, so 240s was tight).
    it(`${label}: every tier profits on every seed; tiers 2-3 beat tier 1 by median`, { timeout: 360_000 }, () => {
      const byTier: number[][] = [];
      for (const tier of [1, 2, 3]) {
        const profits = SEEDS.map((seed) => measureIdleTier(tier, competitive, seed, TICKS));
        for (let i = 0; i < profits.length; i++) {
          expect(profits[i]!, `tier ${tier} seed ${SEEDS[i]} (${label}) unprofitable: ${profits[i]}`).toBeGreaterThan(0);
        }
        byTier.push(profits);
      }
      expect(median(byTier[1]!), `tier 2 median fails to beat tier 1 (${label})`).toBeGreaterThan(median(byTier[0]!));
      expect(median(byTier[2]!), `tier 3 median fails to beat tier 1 (${label})`).toBeGreaterThan(median(byTier[0]!));
      // Magnitude ceiling (FINDINGS #33): sign+ordering checks let a tier-3
      // exotic money printer (+140k–195k/8k ticks, ~120× tier 1) hide for
      // multiple phases. Healthy tiers run 2–5× tier 1; 20× is generous
      // headroom that still catches corridor-farming regressions.
      for (const t of [1, 2]) {
        expect(
          median(byTier[t]!),
          `tier ${t + 1} median is a money printer vs tier 1 (${label})`,
        ).toBeLessThan(20 * median(byTier[0]!));
      }
    });
  }
});
