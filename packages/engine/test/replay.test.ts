import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/commands';
import { hashState } from '../src/hash';
import { netWorth } from '../src/report';
import { replayRun, type RunLogEntry } from '../src/replay';
import { addAgent, createWorld, tickWorld } from '../src/sim';

// The leaderboard anti-cheat: a recorded run must replay bit-identically.
describe('replay verifier', () => {
  it('record -> replay reproduces the exact world hash and worth', () => {
    const SEED = 42;
    const START = 200_000;
    // Live run, driven the way the UI drives it: commands at the current
    // tick, world advanced between them. Recorded into a log as we go.
    const world = createWorld({ seed: SEED });
    const human = addAgent(world, 'player', START, {});
    human.policy = 'idle';
    const log: RunLogEntry[] = [];
    const issue = (cmd: Parameters<typeof applyCommand>[2]): void => {
      log.push({ tick: world.tick, cmd });
      applyCommand(world, human.id, cmd);
    };

    const item = world.items[0]!.id;
    issue({ type: 'buyUpgrade', upgradeId: 'autoFlip' }); // tick 0: hire the clerk
    for (let t = 0; t < 500; t++) tickWorld(world);
    issue({ type: 'place', itemId: item, side: 'buy', price: 5, qty: 1 }); // resting lowball
    issue({ type: 'configureBot', capitalFraction: 0.4 });
    for (let t = 0; t < 700; t++) tickWorld(world);
    issue({ type: 'cancel', side: 'buy' });
    issue({ type: 'buySlot' });
    for (let t = 0; t < 300; t++) tickWorld(world);

    const live = { worth: netWorth(world, human), tick: world.tick, hash: hashState(world) };
    const replayed = replayRun(SEED, START, log, live.tick);
    expect(replayed.hash).toBe(live.hash); // bit-identical world
    expect(replayed.worth).toBe(live.worth);
    expect(replayed.finalTick).toBe(live.tick);

    // Tampered claims fail: drop one command and the universe diverges.
    const tampered = replayRun(SEED, START, log.slice(0, -1), live.tick);
    expect(tampered.hash).not.toBe(live.hash);
  });
});
