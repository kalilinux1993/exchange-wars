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

/** The leaderboard race format: best worth at EXACTLY this tick. A bounded
 * horizon keeps server-side replay inside Edge Function CPU budgets AND
 * makes scores comparable — open-ended worth isn't a fair ranking.
 * 2k, found empirically: 10k AND 5k replays of the 120-item world tripped
 * the free-tier worker's CPU limit (546 WORKER_RESOURCE_LIMIT). A tight
 * sprint is also a better race — every early flip matters. */
export const SPRINT_TICKS = 2_000;
/** Sanity bound: ~1 command per 2 ticks is already inhuman. */
export const SPRINT_MAX_COMMANDS = 5_000;

export interface SprintVerdict {
  ok: boolean;
  reason?: string;
  worth: number;
  hash: string;
}

/**
 * Validate + replay a sprint submission. Pure and total for JSON inputs:
 * malformed commands replay as engine rejections, structural problems return
 * a reason instead of throwing. This is what the verify-score Edge Function
 * runs server-side — and what the client runs locally before submitting.
 */
export function verifySprint(seed: number, startGp: number, log: RunLogEntry[]): SprintVerdict {
  const bad = (reason: string): SprintVerdict => ({ ok: false, reason, worth: 0, hash: '' });
  if (!Number.isSafeInteger(seed) || seed < 0) return bad('bad-seed');
  if (!Number.isSafeInteger(startGp) || startGp < 1) return bad('bad-start');
  if (!Array.isArray(log) || log.length > SPRINT_MAX_COMMANDS) return bad('log-too-long');
  for (let i = 0; i < log.length; i++) {
    const e = log[i]!;
    if (!e || !Number.isSafeInteger(e.tick) || e.tick < 0 || e.tick >= SPRINT_TICKS) return bad('bad-tick');
    if (i > 0 && e.tick < log[i - 1]!.tick) return bad('out-of-order');
    if (typeof e.cmd !== 'object' || e.cmd === null) return bad('bad-cmd');
  }
  try {
    const r = replayRun(seed, startGp, log, SPRINT_TICKS);
    return { ok: true, worth: r.worth, hash: r.hash };
  } catch {
    return bad('replay-error');
  }
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
