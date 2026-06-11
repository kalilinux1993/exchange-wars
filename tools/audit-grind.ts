// Audit: what does pure tick-free dungeon grinding score in a 2k sprint?
// Fists-first (at tick 0 the books are empty — you can't even buy a shark),
// greedy-but-careful policy, bounded by SPRINT_MAX_COMMANDS.
import { applyCommand } from '../packages/engine/src/commands';
import type { PlayerCommand } from '../packages/engine/src/commands';
import { netWorth } from '../packages/engine/src/report';
import { PLAYER_BASE, REGION_CLEAR_KILLS, REGIONS } from '../packages/engine/src/quest';
import { SPRINT_MAX_COMMANDS, SPRINT_TICKS, verifySprint, type RunLogEntry } from '../packages/engine/src/replay';
import { addAgent, createWorld, tickWorld } from '../packages/engine/src/sim';

const START = 55_000;

function grind(seed: number, restTo = 35): { worth: number; verified: number; deepest: number; kills: number; cmds: number } {
  const world = createWorld({ seed });
  const human = addAgent(world, 'player', START, {});
  human.policy = 'idle';
  const log: RunLogEntry[] = [];
  const issue = (cmd: PlayerCommand): boolean => {
    if (log.length >= SPRINT_MAX_COMMANDS - 1) return false;
    if (world.tick >= SPRINT_TICKS) return false; // sprint clock has run out
    log.push({ tick: world.tick, cmd });
    applyCommand(world, human.id, cmd);
    return true;
  };
  let kills = 0;
  let guard = 0;
  while (log.length < SPRINT_MAX_COMMANDS - 5 && world.tick < SPRINT_TICKS && guard++ < 30_000) {
    const exp = human.expedition;
    if (!exp) {
      // Wounds persist: rest at home until fit to dive (ticks pass, no commands).
      while ((human.hp ?? PLAYER_BASE.maxHp) < restTo && world.tick < SPRINT_TICKS) tickWorld(world);
      if (world.tick >= SPRINT_TICKS) break;
      const frontier = Math.min(human.questProgress ?? 0, REGIONS.length - 1);
      if (!issue({ type: 'startExpedition', regionId: REGIONS[frontier]!.id, pack: {} })) break;
      continue;
    }
    if (exp.combat) {
      const beforeKills = world.stats.monstersSlain ?? 0;
      // Fists policy: flee anything that out-classes bare knuckles badly.
      const dangerous = ['lesser_demon', 'fire_giant', 'green_dragon', 'vorkanth', 'moss_giant'].includes(exp.combat.monsterId);
      const canEat = (exp.pack['shark'] ?? 0) > 0;
      if (exp.combat.playerHp < 18 && canEat) {
        if (!issue({ type: 'eatFood', itemId: 'shark' })) break;
      } else if (dangerous || (exp.combat.playerHp < 12 && !canEat)) {
        if (!issue({ type: 'fleeCombat' })) break;
      } else if (!issue({ type: 'fight' })) break;
      if ((world.stats.monstersSlain ?? 0) > beforeKills) kills++;
      continue;
    }
    if (exp.event) {
      // Take every shrine when hurt (free-ish healing), skip the dice.
      const accept = exp.event.kind === 'shrine' && exp.hp < 25 && exp.packGp >= 200;
      if (!issue({ type: 'choose', accept })) break;
      continue;
    }
    // Extract when the region is cleared (banks loot + resets hp next trip)
    // or when too hurt to continue barehanded.
    if (exp.cleared >= REGION_CLEAR_KILLS || exp.hp < 10) {
      if (!issue({ type: 'extract' })) break;
      continue;
    }
    if (!issue({ type: 'advance' })) break;
  }
  if (human.expedition && !human.expedition.combat && !human.expedition.event) {
    issue({ type: 'extract' });
  }
  const v = verifySprint(seed, START, log);
  return {
    worth: netWorth(world, human),
    verified: v.ok ? v.worth : -1,
    deepest: v.deepest,
    kills,
    cmds: log.length,
  };
}

/** Trading benchmark: hire the autoFlip clerk at tick 0 and let it run the sprint. */
function trade(seed: number): number {
  const log: RunLogEntry[] = [
    { tick: 0, cmd: { type: 'buyUpgrade', upgradeId: 'autoFlip' } },
    { tick: 0, cmd: { type: 'configureBot', capitalFraction: 0.8 } },
  ];
  const v = verifySprint(seed, START, log);
  return v.ok ? v.worth : -1;
}

for (const seed of [7, 42, 666, 1337, 2024]) {
  const t = trade(seed);
  const byRest = [15, 25, 35, 50].map((restTo) => {
    const r = grind(seed, restTo);
    return `rest${restTo}: ${r.verified} (${r.kills}k/${r.cmds}c)`;
  });
  console.log(`seed ${seed}: ${byRest.join(' · ')} | clerk-trade ${t} | idle 55000`);
}
