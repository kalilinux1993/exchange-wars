// Audit: what do the sprint strategies score in a 2k sprint? (FINDINGS #45/#46/#47)
// - naked grind: fists-first, no capital invested
// - geared grind: shop the books while resting (buys are tick-free commands;
//   wounds mend while you shop), embark armored with food, fight deeper
// - clerk-trade: hire the autoFlip clerk at tick 0
// All scored by verifySprint — the leaderboard's real arbiter.
import { applyCommand } from '../packages/engine/src/commands';
import type { PlayerCommand } from '../packages/engine/src/commands';
import { bestAsk } from '../packages/engine/src/exchange';
import { netWorth } from '../packages/engine/src/report';
import { CONSUMABLES, GEAR, PLAYER_BASE, REGION_CLEAR_KILLS, REGIONS } from '../packages/engine/src/quest';
import { SPRINT_MAX_COMMANDS, SPRINT_TICKS, verifySprint, type RunLogEntry } from '../packages/engine/src/replay';
import { addAgent, createWorld, tickWorld } from '../packages/engine/src/sim';

const START = 55_000;
const DEBUG = process.argv.includes('--debug');
const WISHLIST = ['rune_2h_sword', 'rune_platebody', 'rune_kiteshield', 'rune_full_helm', 'rune_platelegs'];
const FOOD_TARGET = 6;

function grind(
  seed: number,
  restTo = 35,
  geared = false,
): { worth: number; verified: number; deepest: number; kills: number; cmds: number; spent: number } {
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
  // Buy missing kit + food at the current ask (instant fill when crossing).
  // One attempt per item per home visit — an audit policy, not a trading bot.
  const shop = (): void => {
    for (const id of WISHLIST) {
      if ((human.inventory[id] ?? 0) > 0) continue;
      const book = world.books[id];
      const ask = book ? bestAsk(book) : null;
      if (!ask || ask.price > human.gp) continue;
      issue({ type: 'place', itemId: id, side: 'buy', price: ask.price, qty: 1 });
    }
    const sharks = human.inventory['shark'] ?? 0;
    if (sharks < FOOD_TARGET) {
      const book = world.books['shark'];
      const ask = book ? bestAsk(book) : null;
      if (ask && ask.price * (FOOD_TARGET - sharks) <= human.gp) {
        issue({ type: 'place', itemId: 'shark', side: 'buy', price: ask.price, qty: FOOD_TARGET - sharks });
      }
    }
  };
  let kills = 0;
  let spent = 0;
  let guard = 0;
  while (log.length < SPRINT_MAX_COMMANDS - 5 && world.tick < SPRINT_TICKS && guard++ < 30_000) {
    const exp = human.expedition;
    if (!exp) {
      // Wounds persist: rest at home until fit to dive (ticks pass, no commands).
      while ((human.hp ?? PLAYER_BASE.maxHp) < restTo && world.tick < SPRINT_TICKS) tickWorld(world);
      if (world.tick >= SPRINT_TICKS) break;
      if (geared) {
        const gpBefore = human.gp;
        shop();
        spent += gpBefore - human.gp;
      }
      const pack: Record<string, number> = {};
      if (geared) {
        for (const id of Object.keys(GEAR)) if ((human.inventory[id] ?? 0) > 0) pack[id] = 1; // best-per-slot
        for (const id of Object.keys(CONSUMABLES)) {
          const q = human.inventory[id] ?? 0;
          if (q > 0) pack[id] = q;
        }
      }
      const frontier = Math.min(human.questProgress ?? 0, REGIONS.length - 1);
      if (!issue({ type: 'startExpedition', regionId: REGIONS[frontier]!.id, pack })) break;
      continue;
    }
    if (exp.combat) {
      const beforeKills = world.stats.monstersSlain ?? 0;
      const armed = (exp.pack['rune_2h_sword'] ?? 0) > 0;
      // Naked: flee anything that out-classes bare knuckles. Armed: only the Elder.
      const fleeList = armed
        ? ['vorkanth']
        : ['lesser_demon', 'fire_giant', 'green_dragon', 'vorkanth', 'moss_giant'];
      const dangerous = fleeList.includes(exp.combat.monsterId);
      const canEat = (exp.pack['shark'] ?? 0) > 0;
      const eatAt = armed ? 25 : 18;
      if (exp.combat.playerHp < eatAt && canEat) {
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
    // Extract when the region is cleared (banks loot) or too hurt to continue.
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
  if (DEBUG) {
    const positions = Object.entries(human.inventory)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ id, q, mark: (world.books[id]?.lastPrice ?? 0) * q }))
      .sort((a, b) => b.mark - a.mark)
      .slice(0, 6);
    console.log(`  [debug seed ${seed}] gp ${human.gp} · top holdings:`, positions);
  }
  return {
    worth: netWorth(world, human),
    verified: v.ok ? v.worth : -1,
    deepest: v.deepest,
    kills,
    cmds: log.length,
    spent,
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
  const naked = grind(seed, 15);
  const g15 = grind(seed, 15, true);
  const g35 = grind(seed, 35, true);
  const t = trade(seed);
  const fmt = (r: ReturnType<typeof grind>): string =>
    `${r.verified} (${r.kills}k d${r.deepest} ${r.cmds}c${r.spent ? ` spent ${r.spent}` : ''})`;
  console.log(
    `seed ${seed}: naked15 ${fmt(naked)} · geared15 ${fmt(g15)} · geared35 ${fmt(g35)} | clerk ${t} | idle 55000`,
  );
}
