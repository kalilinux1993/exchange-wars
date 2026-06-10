// Pure measurement helpers shared by the balance CLI and the balance gate.
import { applyCommand, PROGRESSION } from './commands';
import { netWorth } from './report';
import { addAgent, createWorld, runTicks } from './sim';

export const BALANCE_WORKING_CAPITAL = 150_000;

/**
 * Profit of an idle autoFlip player at `tier` after `ticks`. Working capital
 * is normalized to BALANCE_WORKING_CAPITAL after upgrade purchases so tiers
 * compare fairly. `competitive` adds the default scripted flipper to the world.
 */
export function measureIdleTier(tier: number, competitive: boolean, seed: number, ticks: number): number {
  const state = createWorld({ seed, players: competitive ? 1 : 0 });
  const spend = PROGRESSION.upgrades.autoFlip.costs.slice(0, tier).reduce((a, b) => a + b, 0);
  const idle = addAgent(state, 'player', BALANCE_WORKING_CAPITAL + spend, {});
  idle.policy = 'idle';
  for (let t = 0; t < tier; t++) {
    const r = applyCommand(state, idle.id, { type: 'buyUpgrade', upgradeId: 'autoFlip' });
    if (!r.ok) throw new Error(`buyUpgrade failed at tier ${t + 1}: ${r.reason}`);
  }
  runTicks(state, ticks);
  return netWorth(state, idle) - BALANCE_WORKING_CAPITAL;
}
