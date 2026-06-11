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
import { CONSUMABLES, deriveStats, GEAR, levelsOf, PLAYER_BASE, REGION_CLEAR_KILLS, REGIONS } from '../packages/engine/src/quest';
import { SPRINT_MAX_COMMANDS, SPRINT_TICKS, verifySprint, type RunLogEntry } from '../packages/engine/src/replay';
import { addAgent, createWorld, tickWorld } from '../packages/engine/src/sim';

const START = 55_000;
const DEBUG = process.argv.includes('--debug');
// The full gear ladder, grouped by slot, strongest first. A sprint fighter
// CLIMBS it — darts at level 1, staff at 7, rune mid-sprint — rather than
// saving for rune kit he'll never qualify to wield (FINDINGS #51).
const LADDER = new Map<string, { id: string; atk: number; def: number; req: number; weapon: boolean }[]>();
for (const [id, g] of Object.entries(GEAR)) {
  const list = LADDER.get(g.slot) ?? [];
  list.push({ id, atk: g.atk, def: g.def, req: g.req, weapon: g.slot === 'weapon' });
  LADDER.set(g.slot, list);
}
for (const list of LADDER.values()) list.sort((a, b) => b.atk + b.def - (a.atk + a.def));
const FOOD_TARGET = 6;

function grind(
  seed: number,
  restTo = 35,
  geared = false,
): { worth: number; verified: number; deepest: number; kills: number; cmds: number; spent: number; deaths: number } {
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
  // QUALIFIED shopping: only buy gear you can already USE — paying the bid/ask
  // spread at tick 0 for kit that stays inert until Attack 12-14 was suspect
  // #1 for geared raiding measuring underwater (FINDINGS #50/#51).
  const shop = (): void => {
    const lv = levelsOf(human.combatXp);
    for (const list of LADDER.values()) {
      // Best USABLE rung this slot — buy it if it's an upgrade we don't own.
      const target = list.find((e) => (e.weapon ? lv.atk : lv.def) >= e.req);
      if (!target || (human.inventory[target.id] ?? 0) > 0) continue;
      const book = world.books[target.id];
      const ask = book ? bestAsk(book) : null;
      if (!ask || ask.price > human.gp) continue;
      issue({ type: 'place', itemId: target.id, side: 'buy', price: ask.price, qty: 1 });
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
  let deaths = 0;
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
      // Usable strength, not carried strength — under-leveled gear is inert (8n).
      const armed = deriveStats(exp.pack, levelsOf(human.combatXp)).atk >= 30;
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
      if (!human.expedition) deaths++; // the depths kept the body
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
      .map(([id, q]) => ({ id, q, lastX: (world.books[id]?.lastPrice ?? 0) * q })) // lastPrice ref only — worth uses the bid walk
      .sort((a, b) => b.lastX - a.lastX)
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
    deaths,
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
    `${r.verified} (${r.kills}k d${r.deepest} ${r.deaths}† ${r.cmds}c${r.spent ? ` spent ${r.spent}` : ''})`;
  console.log(
    `seed ${seed}: naked15 ${fmt(naked)} · geared15 ${fmt(g15)} · geared35 ${fmt(g35)} | clerk ${t} | idle 55000`,
  );
}
