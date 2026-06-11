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
      if (agent.expedition.combat) ok(state, id, { type: 'fight' });
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

  it('fleeing ends the encounter without kill credit; market RNG is untouched', () => {
    const { state, id } = fixture(11);
    const agent = state.agents[id]!;
    const marketCursor = state.rngState;
    ok(state, id, { type: 'startExpedition', regionId: 'lumbridge_plains', pack: { shark: 2 } });
    ok(state, id, { type: 'advance' });
    let guard = 0;
    while (agent.expedition?.combat && guard++ < 50) {
      ok(state, id, { type: 'fleeCombat' });
      if (agent.expedition && !agent.expedition.combat) break;
    }
    if (agent.expedition) {
      expect(agent.expedition.cleared).toBe(0); // running away earns nothing
    }
    expect(state.rngState).toBe(marketCursor); // the world's cursor never moved
  });
});
