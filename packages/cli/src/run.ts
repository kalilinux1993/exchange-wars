// Headless sim runner. Wall-clock APIs are fine HERE — just never in the engine.
//   npm run sim -- --seed 42 --ticks 10000 [--report-every 2000]
import { checkInvariants, createWorld, hashState, renderReport, runTicks } from '@exchange-wars/engine';

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1 || i === process.argv.length - 1) return fallback;
  const v = Number(process.argv[i + 1]);
  if (!Number.isFinite(v)) throw new Error(`bad value for --${name}`);
  return v;
}

const seed = arg('seed', 42);
const ticks = arg('ticks', 10_000);
const reportEvery = arg('report-every', 0);

const t0 = performance.now();
const state = createWorld({ seed });
if (reportEvery > 0) {
  for (let done = 0; done < ticks; ) {
    const step = Math.min(reportEvery, ticks - done);
    runTicks(state, step);
    done += step;
    console.log(renderReport(state));
    console.log('');
  }
} else {
  runTicks(state, ticks);
  console.log(renderReport(state));
}
checkInvariants(state);
const ms = performance.now() - t0;
console.log(`state hash ${hashState(state)} · ${ticks} ticks in ${ms.toFixed(0)}ms · invariants OK`);
