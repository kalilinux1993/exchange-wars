// The anti-cheat core for verified leaderboards: determinism means a
// recorded run can be REPLAYED. Same seed + same commands at the same ticks
// ⇒ bit-identical world ⇒ a claimed score either reproduces or it's a lie.
import { applyCommand } from './commands';
import type { PlayerCommand } from './commands';
import { hashState } from './hash';
import { netWorth } from './report';
import { addAgent, createWorld, tickWorld } from './sim';

export interface RunLogEntry {
  /** World tick at which the command was issued (applied before tick+1 runs). */
  tick: number;
  cmd: PlayerCommand;
}

export interface ReplayResult {
  worth: number;
  finalTick: number;
  hash: string;
}

/**
 * Rebuild a run from its seed and command log. Commands recorded at tick T
 * are applied once the world reaches T, before T+1 advances — matching the
 * UI, which applies a command immediately at the current tick. Engine-side
 * automation (clerks) replays for free inside tickWorld. Rejected commands
 * replay as rejections — the log is applied verbatim, not validated.
 */
export function replayRun(
  seed: number,
  startGp: number,
  log: RunLogEntry[],
  finalTick: number,
): ReplayResult {
  const world = createWorld({ seed });
  const human = addAgent(world, 'player', startGp, {});
  human.policy = 'idle';
  let i = 0;
  while (i < log.length && log[i]!.tick <= world.tick) {
    applyCommand(world, human.id, log[i]!.cmd);
    i++;
  }
  while (world.tick < finalTick) {
    tickWorld(world);
    while (i < log.length && log[i]!.tick <= world.tick) {
      applyCommand(world, human.id, log[i]!.cmd);
      i++;
    }
  }
  return { worth: netWorth(world, human), finalTick: world.tick, hash: hashState(world) };
}
