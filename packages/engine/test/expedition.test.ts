import { describe, expect, it } from 'vitest';
import { applyCommand, type PlayerCommand } from '../src/commands';
import { hashState } from '../src/hash';
import { checkInvariants } from '../src/invariants';
import { PLAYER_BASE, REGION_CLEAR_KILLS, REGIONS } from '../src/quest';
import { addAgent, createWorld } from '../src/sim';
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

  it('fleeing ends the encounter without kill credit; market RNG is untouched', () => {
    const { state, id } = fixture(11);
    const agent = state.agents[id]!;
    const marketCursor = state.rngState;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { shark: 2 } });
    let guard = 0;
    while (agent.expedition && !agent.expedition.combat && guard++ < 30) {
      if (agent.expedition.event) ok(state, id, { type: 'choose', accept: false });
      else ok(state, id, { type: 'advance' });
    }
    while (agent.expedition?.combat && guard++ < 80) {
      ok(state, id, { type: 'fleeCombat' });
      if (agent.expedition && !agent.expedition.combat) break;
    }
    if (agent.expedition) {
      expect(agent.expedition.cleared).toBe(0); // running away earns nothing
    }
    expect(state.rngState).toBe(marketCursor); // the world's cursor never moved
  });
});
