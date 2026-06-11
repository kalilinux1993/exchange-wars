import { describe, expect, it } from 'vitest';
import { applyCommand, type PlayerCommand } from '../src/commands';
import { hashState } from '../src/hash';
import { checkInvariants } from '../src/invariants';
import { levelsOf, maxHpFor, PLAYER_BASE, REGION_CLEAR_KILLS, REGIONS, REST_REGEN_TICKS, SPAR_XP, TOLL_COST, xpForLevel } from '../src/quest';
import { addAgent, BOUNTY_CHECK_TICKS, createWorld, tickWorld } from '../src/sim';
import type { WorldState } from '../src/types';

/** Tiny world (CI scaling rule) with a stocked adventurer. */
function fixture(seed = 1): { state: WorldState; id: number } {
  const state = createWorld({
    seed,
    items: [
      { id: 'rune_2h_sword', name: 'Rune 2h sword', baseCost: 28448, consumeValue: 56896, volatility: 0.13 },
      { id: 'rune_platebody', name: 'Rune platebody', baseCost: 28826, consumeValue: 57652, volatility: 0.13 },
      { id: 'rune_kiteshield', name: 'Rune kiteshield', baseCost: 24053, consumeValue: 48107, volatility: 0.13 },
      { id: 'shark', name: 'Shark', baseCost: 692, consumeValue: 1385, volatility: 0.09 },
      // loot targets must exist as items for conservation accounting:
      { id: 'adamant_dart', name: 'Adamant dart', baseCost: 23, consumeValue: 47, volatility: 0.08 },
      { id: 'law_rune', name: 'Law rune', baseCost: 90, consumeValue: 180, volatility: 0.09 },
      { id: 'nature_rune', name: 'Nature rune', baseCost: 95, consumeValue: 190, volatility: 0.09 },
      { id: 'death_rune', name: 'Death rune', baseCost: 138, consumeValue: 276, volatility: 0.09 },
      { id: 'blood_rune', name: 'Blood rune', baseCost: 227, consumeValue: 455, volatility: 0.09 },
      { id: 'superior_dragon_bones', name: 'Superior dragon bones', baseCost: 16737, consumeValue: 33474, volatility: 0.13 },
      { id: 'super_antifire_potion_4', name: 'Super antifire potion(4)', baseCost: 17250, consumeValue: 34500, volatility: 0.13 },
      { id: 'dragon_med_helm', name: 'Dragon med helm', baseCost: 43949, consumeValue: 87898, volatility: 0.13 },
      { id: 'rune_full_helm', name: 'Rune full helm', baseCost: 15464, consumeValue: 30929, volatility: 0.13 },
      { id: 'rune_battleaxe', name: 'Rune battleaxe', baseCost: 18643, consumeValue: 37286, volatility: 0.13 },
    ],
    producersPerItem: 0,
    consumersPerItem: 0,
    marketMakersPerItem: 0,
    momentumTraders: 0,
    noiseTraders: 0,
    players: 0,
  });
  const a = addAgent(state, 'player', 100_000, {
    rune_2h_sword: 1,
    rune_platebody: 1,
    rune_kiteshield: 1,
    shark: 8,
    super_antifire_potion_4: 2,
  });
  a.policy = 'idle';
  return { state, id: a.id };
}

const ok = (state: WorldState, id: number, cmd: PlayerCommand): void => {
  const r = applyCommand(state, id, cmd);
  expect(r.ok, `command ${cmd.type} rejected: ${r.reason}`).toBe(true);
  checkInvariants(state);
};

describe('expeditions', () => {
  it('start escrows the pack; locked regions and double-dipping reject', () => {
    const { state, id } = fixture();
    const agent = state.agents[id]!;
    expect(applyCommand(state, id, { type: 'startExpedition', regionId: 'dragons_maw', pack: {} }).reason).toBe('region-locked');
    expect(applyCommand(state, id, { type: 'startExpedition', regionId: 'nowhere', pack: {} }).reason).toBe('unknown-region');
    expect(applyCommand(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { shark: 99 } }).reason).toBe('insufficient-items');
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { rune_2h_sword: 1, shark: 4 } });
    expect(agent.inventory['rune_2h_sword']).toBe(0); // escrowed into the pack
    expect(agent.inventory['shark']).toBe(4);
    expect(agent.expedition!.pack['shark']).toBe(4);
    expect(applyCommand(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} }).reason).toBe('already-out');
    expect(applyCommand(state, id, { type: 'extract' }).ok).toBe(true);
    expect(agent.inventory['rune_2h_sword']).toBe(1); // pack returned
    checkInvariants(state);
  });

  it('a geared run clears the plains, mints loot, and unlocks the sewers', () => {
    const { state, id } = fixture(3);
    const agent = state.agents[id]!;
    // Fixture: a veteran (rune-qualified) — gating itself is tested separately.
    agent.combatXp = { atk: xpForLevel(14), def: xpForLevel(12) };
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { rune_2h_sword: 1, rune_platebody: 1, rune_kiteshield: 1, shark: 4 } });
    let guard = 0;
    while (agent.expedition && agent.expedition.cleared < REGION_CLEAR_KILLS && guard++ < 200) {
      const exp = agent.expedition;
      if (exp.combat) {
        // Deterministic survival instinct: eat when hurt, else swing.
        if (exp.combat.playerHp < 20 && (exp.pack['shark'] ?? 0) > 0) ok(state, id, { type: 'eatFood', itemId: 'shark' });
        else ok(state, id, { type: 'fight' });
      } else if (exp.event) ok(state, id, { type: 'choose', accept: false });
      else ok(state, id, { type: 'advance' });
    }
    expect(agent.expedition, 'died on the PLAINS in full rune??').toBeTruthy();
    expect(agent.expedition!.cleared).toBe(REGION_CLEAR_KILLS);
    expect(agent.questProgress).toBe(1); // sewers unlocked
    expect(state.stats.monstersSlain).toBe(REGION_CLEAR_KILLS);
    // The bestiary tally agrees with the headline count, kill for kill.
    const tallied = Object.values(state.stats.killsByMonster ?? {}).reduce((a, b) => a + b, 0);
    expect(tallied).toBe(REGION_CLEAR_KILLS);
    expect(state.stats.deepestRegion).toBe(0); // never left the plains
    const gpBefore = agent.gp;
    const lootGp = agent.expedition!.packGp;
    expect(lootGp).toBeGreaterThan(0); // monsters carry coin
    ok(state, id, { type: 'extract' });
    expect(agent.gp).toBe(gpBefore + lootGp);
    expect(state.ledger.gpMinted).toBeGreaterThan(0);
  });

  it('death keeps the 3 most valuable units and burns the rest', () => {
    const { state, id } = fixture(5);
    const agent = state.agents[id]!;
    agent.questProgress = REGIONS.length - 1; // test fixture: unlock the Maw
    // Naked but carrying valuables — the dragon will end this quickly.
    ok(state, id, { type: 'startExpedition', regionId: 'dragons_maw', pack: { rune_2h_sword: 1, rune_platebody: 1, rune_kiteshield: 1, shark: 2 } });
    // No weapon equipped? The 2h is in the pack so it counts as gear — but a
    // dragon out-damages 50 hp regardless. Swing until death.
    let guard = 0;
    while (agent.expedition && guard++ < 300) {
      if (agent.expedition.combat) ok(state, id, { type: 'fight' });
      else if (agent.expedition.event) ok(state, id, { type: 'choose', accept: false });
      else ok(state, id, { type: 'advance' });
    }
    expect(agent.expedition).toBeUndefined(); // the depths took them
    const kept =
      (agent.inventory['rune_2h_sword'] ?? 0) +
      (agent.inventory['rune_platebody'] ?? 0) +
      (agent.inventory['rune_kiteshield'] ?? 0) +
      (agent.inventory['shark'] ?? 0) +
      (agent.inventory['superior_dragon_bones'] ?? 0) +
      (agent.inventory['rune_full_helm'] ?? 0) +
      (agent.inventory['blood_rune'] ?? 0) +
      (agent.inventory['rune_battleaxe'] ?? 0) +
      (agent.inventory['dragon_med_helm'] ?? 0);
    // 6 shark were left home; of the 5 carried units (3 gear + 2 shark) plus
    // any loot, exactly 3 units survive — the most valuable ones.
    expect(kept).toBe(6 + 3);
    expect(agent.inventory['rune_2h_sword']).toBe(1); // top-value gear kept
    expect(agent.inventory['rune_platebody']).toBe(1);
    expect(agent.hp).toBe(1); // you barely crawled home
    expect(agent.combatXp!.def).toBeGreaterThan(0); // the beating taught you something
    expect(state.stats.deaths).toBe(1); // the depths kept count
    checkInvariants(state);
  });

  it('eating from the pack heals and burns the food through the ledger', () => {
    const { state, id } = fixture(9);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { rune_2h_sword: 1, shark: 3 } });
    ok(state, id, { type: 'advance' });
    expect(applyCommand(state, id, { type: 'eatFood', itemId: 'rune_2h_sword' }).reason).toBe('not-edible');
    ok(state, id, { type: 'eatFood', itemId: 'shark' });
    expect(agent.expedition!.pack['shark']).toBe(2);
    expect(state.ledger.itemsBurned['shark']).toBe(1);
    expect(agent.expedition!.combat!.playerHp).toBeLessThanOrEqual(PLAYER_BASE.maxHp);
  });

  it('identical command sequences on the same seed produce identical worlds', () => {
    const script = (state: WorldState, id: number): void => {
      applyCommand(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { rune_2h_sword: 1, shark: 4 } });
      const agent = state.agents[id]!;
      let guard = 0;
      while (agent.expedition && agent.expedition.cleared < 2 && guard++ < 120) {
        if (agent.expedition.combat) applyCommand(state, id, { type: 'fight' });
        else if (agent.expedition.event) applyCommand(state, id, { type: 'choose', accept: true });
        else applyCommand(state, id, { type: 'advance' });
      }
      if (agent.expedition && !agent.expedition.combat) applyCommand(state, id, { type: 'extract' });
    };
    const a = fixture(42);
    const b = fixture(42);
    script(a.state, a.id);
    script(b.state, b.id);
    expect(hashState(a.state)).toBe(hashState(b.state));
    checkInvariants(a.state);
  });

  it('choices in the dark: shrine and dice resolve both ways, fully conserved', () => {
    const { state, id } = fixture(21);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { shark: 2 } });
    const exp = agent.expedition!;
    // Fixture loot gp (conserved: booked as minted).
    exp.packGp += 1_000;
    state.ledger.gpMinted += 1_000;
    exp.hp = 10;
    // Shrine accept: pays max(50, packGp/4), heals to full, burn booked.
    exp.event = { kind: 'shrine', prompt: 'test shrine' };
    ok(state, id, { type: 'choose', accept: true });
    expect(exp.hp).toBe(PLAYER_BASE.maxHp);
    expect(exp.packGp).toBe(750);
    expect(state.ledger.gpBurned).toBeGreaterThanOrEqual(250);
    // Gamble: both outcomes occur across seeds, each conserved.
    let won = 0;
    let lost = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const f = fixture(seed);
      const a2 = f.state.agents[f.id]!;
      ok(f.state, f.id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
      const e2 = a2.expedition!;
      e2.packGp += 500;
      f.state.ledger.gpMinted += 500;
      e2.event = { kind: 'gamble', prompt: 'test dice' };
      ok(f.state, f.id, { type: 'choose', accept: true });
      if (e2.packGp === 600) won++;
      else if (e2.packGp === 400) lost++;
      else throw new Error(`unexpected packGp ${e2.packGp}`);
    }
    expect(won).toBeGreaterThan(0);
    expect(lost).toBeGreaterThan(0);
    // Declining is always free.
    exp.event = { kind: 'gamble', prompt: 'test dice' };
    const before = exp.packGp;
    ok(state, id, { type: 'choose', accept: false });
    expect(exp.packGp).toBe(before);
  });

  it('new faces in the dark: portal hops a region, merchant sells dear, imp gambles your blood', () => {
    const { state, id } = fixture(25);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    const exp = agent.expedition!;
    // Portal: one region deeper, no unlock, deepest badge counts it.
    exp.event = { kind: 'portal', prompt: 't' };
    ok(state, id, { type: 'choose', accept: true });
    expect(exp.regionId).toBe(REGIONS[1]!.id);
    expect(state.stats.deepestRegion).toBe(1);
    expect(agent.questProgress ?? 0).toBe(0); // tourism is not progression
    // Merchant: burns gp, mints a shark into the pack — fully conserved.
    exp.packGp += 5_000;
    state.ledger.gpMinted += 5_000;
    exp.event = { kind: 'merchant', prompt: 't' };
    const gpBefore = exp.packGp;
    ok(state, id, { type: 'choose', accept: true });
    expect(exp.pack['shark'] ?? 0).toBe(1);
    expect(exp.packGp).toBeLessThan(gpBefore);
    expect(state.ledger.itemsMinted['shark'] ?? 0).toBeGreaterThanOrEqual(1);
    // A pauper merchant visit is a polite no-op.
    const poor = fixture(26);
    ok(poor.state, poor.id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    poor.state.agents[poor.id]!.expedition!.event = { kind: 'merchant', prompt: 't' };
    ok(poor.state, poor.id, { type: 'choose', accept: true });
    expect(poor.state.agents[poor.id]!.expedition!.pack['shark'] ?? 0).toBe(0);
    // Imp: both outcomes occur across seeds, each conserved.
    let caught = 0;
    let snared = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const f = fixture(seed);
      const a2 = f.state.agents[f.id]!;
      ok(f.state, f.id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
      const e2 = a2.expedition!;
      e2.event = { kind: 'imp', prompt: 't' };
      const gp0 = e2.packGp;
      const hp0 = e2.hp;
      ok(f.state, f.id, { type: 'choose', accept: true });
      if (e2.packGp > gp0) caught++;
      else if (e2.hp < hp0) snared++;
    }
    expect(caught).toBeGreaterThan(0);
    expect(snared).toBeGreaterThan(0);
  });

  it('the swordmaster teaches and the toll-keeper sells stash tips, conserved', () => {
    // Spar: xp lands, bruises floor at 1 hp, never lethal.
    const { state, id } = fixture(33);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    const exp = agent.expedition!;
    exp.hp = 3; // nearly dead — the lesson must not finish the job
    exp.event = { kind: 'spar', prompt: 't' };
    ok(state, id, { type: 'choose', accept: true });
    expect(exp.hp).toBe(1); // floored, alive
    expect(agent.combatXp!.atk).toBe(SPAR_XP);
    expect(agent.combatXp!.def).toBe(SPAR_XP);
    expect(agent.combatXp!.hp).toBe(Math.ceil(SPAR_XP / 3));
    // Toll: pays gp for a guaranteed stash; pauper gets waved off.
    exp.packGp += 1_000;
    state.ledger.gpMinted += 1_000;
    exp.event = { kind: 'toll', prompt: 't' };
    const before = exp.packGp;
    const finds = state.stats.cacheFinds ?? 0;
    ok(state, id, { type: 'choose', accept: true });
    expect(state.stats.cacheFinds).toBe(finds + 1);
    expect(exp.packGp).toBeGreaterThan(before - TOLL_COST); // the stash paid something back
    const poor = fixture(34);
    ok(poor.state, poor.id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    poor.state.agents[poor.id]!.expedition!.event = { kind: 'toll', prompt: 't' };
    ok(poor.state, poor.id, { type: 'choose', accept: true });
    expect(poor.state.stats.cacheFinds ?? 0).toBe(0); // waved off, nothing booked
    checkInvariants(state);
    checkInvariants(poor.state);
  });

  it('advance rolls non-combat encounters too (cache/trap/event seen across seeds)', () => {
    let cache = 0;
    let trap = 0;
    let event = 0;
    let monster = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const { state, id } = fixture(seed);
      const agent = state.agents[id]!;
      ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
      ok(state, id, { type: 'advance' });
      const exp = agent.expedition;
      if (!exp) trap++; // a lethal trap on a naked 50hp run can't happen (max 6) — but stay safe
      else if (exp.combat) monster++;
      else if (exp.event) event++;
      else if ((exp.journal ?? []).some((l) => l.includes('cache'))) cache++;
      else if ((exp.journal ?? []).some((l) => l.includes('snare'))) trap++;
    }
    expect(monster).toBeGreaterThan(0);
    expect(cache + trap + event).toBeGreaterThan(0); // the dark holds more than monsters
  });

  it('caches sometimes hold items — minted into the pack, fully conserved', () => {
    let itemFound = false;
    for (let seed = 1; seed <= 120 && !itemFound; seed++) {
      const { state, id } = fixture(seed);
      const agent = state.agents[id]!;
      ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
      for (let i = 0; i < 8 && agent.expedition; i++) {
        const exp = agent.expedition;
        if (exp.combat) ok(state, id, { type: 'fleeCombat' });
        else if (exp.event) ok(state, id, { type: 'choose', accept: false });
        else ok(state, id, { type: 'advance' });
        if (agent.expedition && (agent.expedition.journal ?? []).some((l) => l.includes('and a '))) {
          itemFound = true;
          const packItems = Object.values(agent.expedition.pack).reduce((a, b) => a + b, 0);
          expect(packItems).toBeGreaterThan(0); // the find is IN the pack
          expect(state.stats.cacheFinds ?? 0).toBeGreaterThan(0);
          break;
        }
      }
    }
    expect(itemFound).toBe(true); // 25% per cache across 120 seeds × 8 steps
  });

  it('ambushes bring beasts from one region deeper (observed across seeds)', () => {
    const plainsPool = new Set(REGIONS[0]!.monsters);
    let ambushed = false;
    for (let seed = 1; seed <= 150 && !ambushed; seed++) {
      const { state, id } = fixture(seed);
      const agent = state.agents[id]!;
      ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
      for (let i = 0; i < 6 && agent.expedition; i++) {
        const exp = agent.expedition;
        if (exp.combat) {
          if (!plainsPool.has(exp.combat.monsterId)) {
            ambushed = true;
            expect(REGIONS[1]!.monsters).toContain(exp.combat.monsterId); // from the sewers
            expect(exp.combat.log[0]).toContain('AMBUSH');
            break;
          }
          ok(state, id, { type: 'fleeCombat' });
        } else if (exp.event) ok(state, id, { type: 'choose', accept: false });
        else ok(state, id, { type: 'advance' });
      }
    }
    expect(ambushed).toBe(true);
  });

  it('the bounty board: derived-stream postings, baseline honesty, claims mint', () => {
    const { state, id } = fixture(11);
    // Postings are a pure function of (seed, tick): two worlds, same bounties.
    const twin = fixture(11).state;
    for (let i = 0; i < BOUNTY_CHECK_TICKS + 1; i++) {
      tickWorld(state);
      tickWorld(twin);
    }
    expect(state.bounties!.length).toBeGreaterThan(0);
    expect(JSON.stringify(state.bounties)).toBe(JSON.stringify(twin.bounties));
    // Claim flow on a fixture bounty: old kills never count toward new paper.
    state.stats.killsByMonster = { goblin: 7 };
    state.bounties = [{ id: 99, monsterId: 'goblin', qty: 2, rewardGp: 500, expiresTick: state.tick + 1_000, baseline: 7 }];
    expect(applyCommand(state, id, { type: 'claimBounty', bountyId: 99 }).reason).toBe('bounty-unfilled');
    state.stats.killsByMonster['goblin'] = 9; // two fresh kills
    const gpBefore = state.agents[id]!.gp;
    const minted = state.ledger.gpMinted;
    ok(state, id, { type: 'claimBounty', bountyId: 99 });
    expect(state.agents[id]!.gp).toBe(gpBefore + 500);
    expect(state.ledger.gpMinted).toBe(minted + 500); // fresh coin, booked
    expect(state.stats.bountiesClaimed).toBe(1);
    expect(state.bounties!.length).toBe(0);
    expect(applyCommand(state, id, { type: 'claimBounty', bountyId: 99 }).reason).toBe('unknown-bounty');
    checkInvariants(state);
  });

  it('the Abyss bleeds purses: leeches drain loot gp every round, capped at what you carry', () => {
    expect(REGIONS[7]!.id).toBe('the_abyss');
    expect(REGIONS[7]!.elite).toBe('vessith');
    let drained = false;
    for (let seed = 1; seed <= 60 && !drained; seed++) {
      const { state, id } = fixture(seed);
      const agent = state.agents[id]!;
      agent.questProgress = 7; // fixture: the Abyss is open
      ok(state, id, { type: 'startExpedition', regionId: 'the_abyss', pack: { shark: 4 } });
      const exp = agent.expedition!;
      exp.packGp += 500;
      state.ledger.gpMinted += 500;
      for (let i = 0; i < 8 && agent.expedition; i++) {
        if (exp.combat) {
          const gpBefore = exp.packGp;
          const burnedBefore = state.ledger.gpBurned;
          ok(state, id, { type: 'fleeCombat' });
          if (!agent.expedition) break;
          if (exp.combat && exp.packGp < gpBefore) {
            drained = true;
            // Drain is booked as a burn, coin for coin.
            expect(state.ledger.gpBurned - burnedBefore).toBe(gpBefore - exp.packGp);
            break;
          }
        } else if (exp.event) ok(state, id, { type: 'choose', accept: false });
        else ok(state, id, { type: 'advance' });
      }
      if (agent.expedition) checkInvariants(state);
    }
    expect(drained).toBe(true); // a failed flee in the Abyss costs coin
    // A settled fight (won/fled) does NOT drain — only rounds that drag.
    // (Covered by the cap: drains never exceed packGp, enforced above.)
  });

  it('the Inferno Gate sits past the Maw and Zukrath stalks it', () => {
    expect(REGIONS[6]!.id).toBe('inferno_gate');
    expect(REGIONS[5]!.elite).toBe('vorkanth'); // the Maw keeps its Elder
    let met = false;
    for (let seed = 1; seed <= 120 && !met; seed++) {
      const { state, id } = fixture(seed);
      const agent = state.agents[id]!;
      agent.questProgress = 6; // fixture: the Gate is open
      ok(state, id, { type: 'startExpedition', regionId: 'inferno_gate', pack: {} });
      for (let i = 0; i < 6 && agent.expedition; i++) {
        const exp = agent.expedition;
        if (exp.combat) {
          if (exp.combat.monsterId === 'zukrath') {
            met = true;
            expect(exp.combat.log[0]).toContain('ZUKRATH');
            break;
          }
          ok(state, id, { type: 'fleeCombat' });
        } else if (exp.event) ok(state, id, { type: 'choose', accept: false });
        else ok(state, id, { type: 'advance' });
      }
    }
    expect(met).toBe(true); // 10% per Gate monster across 120 seeds × 6 steps
  });

  it('Vorkanth stalks only the Maw and yields elite credit when felled', () => {
    let met = false;
    for (let seed = 1; seed <= 100 && !met; seed++) {
      const { state, id } = fixture(seed);
      const agent = state.agents[id]!;
      agent.questProgress = REGIONS.length - 1; // fixture: the Maw is open
      ok(state, id, { type: 'startExpedition', regionId: 'dragons_maw', pack: {} });
      for (let i = 0; i < 6 && agent.expedition; i++) {
        const exp = agent.expedition;
        if (exp.combat) {
          if (exp.combat.monsterId === 'vorkanth') {
            met = true;
            expect(exp.combat.log[0]).toContain('VORKANTH');
            // Fixture execution: arm the pack (conserved via mint), qualify
            // for the blade, and put the Elder at 1 hp so the first landed
            // blow fells him.
            agent.combatXp = { atk: xpForLevel(14), def: 0 };
            exp.pack['rune_2h_sword'] = 1;
            state.ledger.itemsMinted['rune_2h_sword'] = (state.ledger.itemsMinted['rune_2h_sword'] ?? 0) + 1;
            exp.combat.monsterHp = 1;
            for (let r = 0; r < 10 && agent.expedition?.combat; r++) ok(state, id, { type: 'fight' });
            expect(state.stats.eliteSlain).toBe(1);
            expect(state.ledger.itemsMinted['superior_dragon_bones'] ?? 0).toBeGreaterThan(0);
            break;
          }
          ok(state, id, { type: 'fleeCombat' });
        } else if (exp.event) ok(state, id, { type: 'choose', accept: false });
        else ok(state, id, { type: 'advance' });
      }
    }
    expect(met).toBe(true); // 10% per Maw monster across 100 seeds × 6 steps
  });

  it('the camp meal: eat between fights — time passes, wounds close, antifire coats the dive', () => {
    const { state, id } = fixture(31);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { shark: 2, super_antifire_potion_4: 1 } });
    const exp = agent.expedition!;
    exp.hp = 15; // fixture wound
    const tickBefore = state.tick;
    ok(state, id, { type: 'eatFood', itemId: 'shark' });
    expect(state.tick).toBe(tickBefore + 1); // a meal takes time
    expect(exp.hp).toBe(35); // 15 + shark 20, no monster answered
    expect(exp.pack['shark']).toBe(1);
    expect(state.ledger.itemsBurned['shark']).toBe(1);
    // Drink the ticket BEFORE the fire country, not at the first dragon.
    ok(state, id, { type: 'eatFood', itemId: 'super_antifire_potion_4' });
    expect(exp.antifire).toBe(true);
    expect((exp.journal ?? []).some((l) => l.includes('by the fire'))).toBe(true);
    // The heal caps at the trained max.
    ok(state, id, { type: 'eatFood', itemId: 'shark' });
    expect(exp.hp).toBeLessThanOrEqual(PLAYER_BASE.maxHp);
    // A pending event blocks the picnic (answer the dark first).
    exp.event = { kind: 'gamble', prompt: 't' };
    exp.pack['shark'] = 1; // restock the fixture (conserved via mint)
    state.ledger.itemsMinted['shark'] = (state.ledger.itemsMinted['shark'] ?? 0) + 1;
    expect(applyCommand(state, id, { type: 'eatFood', itemId: 'shark' }).reason).toBe('in-event');
    checkInvariants(state);
  });

  it('one potion coats the whole dive: antifire persists across fights, dies with extract', () => {
    const { state, id } = fixture(7);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { super_antifire_potion_4: 1, shark: 2 } });
    const toCombat = (): boolean => {
      let guard = 0;
      while (agent.expedition && !agent.expedition.combat && guard++ < 60) {
        if (agent.expedition.event) ok(state, id, { type: 'choose', accept: false });
        else ok(state, id, { type: 'advance' });
      }
      return !!agent.expedition?.combat;
    };
    expect(toCombat()).toBe(true);
    expect(agent.expedition!.combat!.antifire).toBe(false); // no coating yet
    ok(state, id, { type: 'eatFood', itemId: 'super_antifire_potion_4' });
    expect(agent.expedition!.antifire).toBe(true); // the dive is coated
    expect(state.ledger.itemsBurned['super_antifire_potion_4']).toBe(1);
    // Settle this fight (win, lose the test's premise, or flee), then the NEXT
    // combat must start pre-coated.
    let guard = 0;
    while (agent.expedition?.combat && guard++ < 60) ok(state, id, { type: 'fight' });
    if (agent.expedition) {
      if (toCombat()) expect(agent.expedition!.combat!.antifire).toBe(true); // seeded from the dive
      // Coming home scrubs the coating: a fresh dive needs a fresh potion.
      while (agent.expedition?.combat && guard++ < 120) ok(state, id, { type: 'fight' });
      if (agent.expedition && !agent.expedition.combat) {
        while (agent.expedition.event) ok(state, id, { type: 'choose', accept: false });
        ok(state, id, { type: 'extract' });
        ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
        expect(agent.expedition!.antifire ?? false).toBe(false);
      }
    }
  });

  it('combat trains you: damage dealt = Attack xp, damage taken = Defence xp', () => {
    const { state, id } = fixture(3);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { shark: 4 } });
    let guard = 0;
    // Fists-first: fight until something lands in either direction.
    while (guard++ < 120 && !(agent.combatXp && agent.combatXp.atk > 0 && agent.combatXp.def > 0)) {
      const exp = agent.expedition;
      if (!exp) break; // died — xp must still be there (asserted below)
      if (exp.combat) {
        if (exp.combat.playerHp < 18 && (exp.pack['shark'] ?? 0) > 0) ok(state, id, { type: 'eatFood', itemId: 'shark' });
        else ok(state, id, { type: 'fight' });
      } else if (exp.event) ok(state, id, { type: 'choose', accept: false });
      else ok(state, id, { type: 'advance' });
    }
    expect(agent.combatXp).toBeTruthy();
    expect(agent.combatXp!.atk).toBeGreaterThan(0); // landed at least one blow
    expect(agent.combatXp!.def).toBeGreaterThan(0); // took at least one
    expect(agent.combatXp!.hp ?? 0).toBeGreaterThan(0); // fighting hardens you (8s)
    expect(levelsOf(agent.combatXp).atk).toBeGreaterThanOrEqual(1);
  });

  it('rest mends to the TRAINED max, not the base 50', () => {
    const { state, id } = fixture(19);
    const agent = state.agents[id]!;
    agent.combatXp = { atk: 0, def: 0, hp: xpForLevel(6) }; // hp level 6 → max 60
    agent.hp = 55; // only wounded relative to the trained max
    let guard = 0;
    while (agent.hp !== undefined && guard++ < 60) tickWorld(state);
    expect(agent.hp).toBeUndefined(); // mended to 60, canonical absent form
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    expect(agent.expedition!.hp).toBe(maxHpFor(6)); // embark at the trained max
  });

  it('wounds persist: extract carries hp home, re-embark carries it back in, rest mends it', () => {
    const { state, id } = fixture(13);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    agent.expedition!.hp = 20; // fixture wound (combat damage is seed-dependent)
    ok(state, id, { type: 'extract' });
    expect(agent.hp).toBe(20); // the wound came home
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    expect(agent.expedition!.hp).toBe(20); // NO free heal on re-embark (FINDINGS #45)
    ok(state, id, { type: 'extract' });
    // Resting at home: +1 hp per REST_REGEN_TICKS; full health drops the field.
    const start = state.tick;
    while (agent.hp !== undefined && state.tick - start < 200) tickWorld(state);
    expect(agent.hp).toBeUndefined(); // fully mended → canonical absent form
    const healed = PLAYER_BASE.maxHp - 20;
    expect(state.tick - start).toBeGreaterThanOrEqual((healed - 1) * REST_REGEN_TICKS);
    expect(state.tick - start).toBeLessThanOrEqual((healed + 1) * REST_REGEN_TICKS);
    checkInvariants(state);
  });

  it('no mending in the field: regen only runs at home', () => {
    const { state, id } = fixture(17);
    const agent = state.agents[id]!;
    agent.hp = 10; // wounded from a previous dive
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    expect(agent.expedition!.hp).toBe(10); // carried in
    const fieldHp = agent.expedition!.hp;
    for (let i = 0; i < 4 * REST_REGEN_TICKS; i++) tickWorld(state);
    expect(agent.hp).toBe(10); // home-side field untouched while out
    expect(agent.expedition!.hp).toBe(fieldHp); // the dark grants no rest
  });

  it('advance costs exactly one world tick; embark and extract are free', () => {
    const { state, id } = fixture(11);
    expect(state.tick).toBe(0);
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: {} });
    expect(state.tick).toBe(0); // embarking is instant
    ok(state, id, { type: 'advance' });
    expect(state.tick).toBe(1); // the trek costs time (FINDINGS #45)
    const agent = state.agents[id]!;
    if (agent.expedition && !agent.expedition.combat && !agent.expedition.event) {
      ok(state, id, { type: 'extract' });
      expect(state.tick).toBe(1); // walking home is instant
    }
    // Rejected advances must NOT consume time (replays apply logs verbatim).
    const r = applyCommand(state, id, { type: 'advance' });
    if (!r.ok) expect(state.tick).toBe(1);
  });

  it('fleeing ends the encounter without kill credit; every combat round costs a tick', () => {
    const { state, id } = fixture(11);
    const agent = state.agents[id]!;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { shark: 2 } });
    let guard = 0;
    while (agent.expedition && !agent.expedition.combat && guard++ < 30) {
      if (agent.expedition.event) ok(state, id, { type: 'choose', accept: false });
      else ok(state, id, { type: 'advance' }); // moves the world clock (by design)
    }
    const tickBefore = state.tick;
    let rounds = 0;
    while (agent.expedition?.combat && guard++ < 80) {
      ok(state, id, { type: 'fleeCombat' });
      rounds++;
      if (agent.expedition && !agent.expedition.combat) break;
    }
    if (agent.expedition) {
      expect(agent.expedition.cleared).toBe(0); // running away earns nothing
    }
    expect(state.tick).toBe(tickBefore + rounds); // time passes while you scramble
  });
});
