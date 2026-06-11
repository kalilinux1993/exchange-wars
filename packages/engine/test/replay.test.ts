import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/commands';
import { hashState } from '../src/hash';
import { netWorth } from '../src/report';
import { replayRun, SPRINT_MAX_COMMANDS, SPRINT_TICKS, verifySprint, type RunLogEntry } from '../src/replay';
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

  it('verifySprint accepts a clean sprint and reports its worth', () => {
    const log: RunLogEntry[] = [
      { tick: 0, cmd: { type: 'buyUpgrade', upgradeId: 'autoFlip' } },
      { tick: Math.floor(SPRINT_TICKS / 2), cmd: { type: 'configureBot', capitalFraction: 0.4 } },
    ];
    const v = verifySprint(42, 200_000, log);
    expect(v.ok).toBe(true);
    expect(v.worth).toBeGreaterThan(0);
    expect(v.hash).not.toBe('');
    // Deterministic: verifying twice gives the identical verdict.
    expect(verifySprint(42, 200_000, log)).toEqual(v);
  });

  it('verifySprint rejects structural cheating without throwing', () => {
    const cmd = { type: 'buySlot' } as const;
    expect(verifySprint(-1, 55_000, []).reason).toBe('bad-seed');
    expect(verifySprint(42, 0, []).reason).toBe('bad-start');
    expect(verifySprint(42, 55_000, [{ tick: SPRINT_TICKS, cmd }]).reason).toBe('bad-tick');
    expect(verifySprint(42, 55_000, [{ tick: -5, cmd }]).reason).toBe('bad-tick');
    expect(
      verifySprint(42, 55_000, [
        { tick: 100, cmd },
        { tick: 50, cmd },
      ]).reason,
    ).toBe('out-of-order');
    const flood = Array.from({ length: SPRINT_MAX_COMMANDS + 1 }, (_, i) => ({
      tick: Math.min(i, SPRINT_TICKS - 1),
      cmd,
    }));
    expect(verifySprint(42, 55_000, flood).reason).toBe('log-too-long');
    // Garbage command shapes replay as engine rejections, not crashes.
    const garbage = [{ tick: 1, cmd: { type: 'place', itemId: 'nope', side: 'buy', price: Number.NaN, qty: 1 } }];
    expect(verifySprint(42, 55_000, garbage as RunLogEntry[]).ok).toBe(true);
  });
});
