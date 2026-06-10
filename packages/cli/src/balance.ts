// Balance measurement harness: idle autoFlip tier curve across seeds and
// scenarios. Working capital is normalized so tiers compare fairly.
//   npm run balance [-- --ticks 8000]
import { BALANCE_WORKING_CAPITAL, measureIdleTier, PROGRESSION } from '@exchange-wars/engine';

const SEEDS = [7, 11, 42, 99, 1337];

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  return Number(process.argv[i + 1]);
}

const TICKS = arg('ticks', 8_000);

function fmt(n: number): string {
  return String(Math.round(n)).padStart(8);
}

console.log(
  `autoFlip tier curve · ${TICKS} ticks · working capital ${BALANCE_WORKING_CAPITAL.toLocaleString('en-US')} · seeds [${SEEDS.join(', ')}]`,
);
for (const competitive of [false, true]) {
  console.log(`\n--- ${competitive ? 'COMPETITIVE (vs scripted flipper)' : 'ISOLATED (no scripted player)'} ---`);
  console.log('tier      ' + SEEDS.map((s) => String(s).padStart(8)).join('') + '      avg  payback(ticks)');
  for (let tier = 0; tier <= PROGRESSION.upgrades.autoFlip.costs.length; tier++) {
    const profits = SEEDS.map((seed) => measureIdleTier(tier, competitive, seed, TICKS));
    const avg = profits.reduce((a, b) => a + b, 0) / profits.length;
    const cost = PROGRESSION.upgrades.autoFlip.costs.slice(0, tier).reduce((a, b) => a + b, 0);
    const payback = tier === 0 || avg <= 0 ? '—' : String(Math.round((cost / avg) * TICKS));
    console.log(`tier ${tier}    ` + profits.map(fmt).join('') + fmt(avg) + `  ${payback}`);
  }
}
