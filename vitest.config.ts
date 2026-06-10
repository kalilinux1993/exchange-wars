import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/*/test/**/*.test.{ts,tsx}'],
    environment: 'node',
    // Sim-heavy gates (longrun, market, balance) outgrow the 5s default,
    // especially on slower CI runners.
    testTimeout: 30_000,
  },
});
