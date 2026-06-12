import { describe, expect, it } from 'vitest';
import { addAgent, createWorld } from '../src/sim';
import { applyCommand } from '../src/commands';
import { checkInvariants } from '../src/invariants';
import { deriveStats } from '../src/quest';

describe('equipment manager', () => {
  it('equips gear from inventory to its slot and back, conserving items', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, { adamant_dart: 1 }); // weapon, req 1
    checkInvariants(state);

    const r = applyCommand(state, p.id, { type: 'equip', itemId: 'adamant_dart' });
    expect(r.ok).toBe(true);
    expect(p.worn?.['weapon']).toBe('adamant_dart');
    expect(p.inventory['adamant_dart'] ?? 0).toBe(0); // left inventory for the slot
    checkInvariants(state); // pure inventory↔worn move — still conserved

    const u = applyCommand(state, p.id, { type: 'unequip', slot: 'weapon' });
    expect(u.ok).toBe(true);
    expect(p.worn?.['weapon']).toBeUndefined();
    expect(p.inventory['adamant_dart']).toBe(1); // returned to inventory
    checkInvariants(state);
  });

  it('swapping a slot returns the old piece to inventory', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, { adamant_dart: 1, rune_dart: 1 }); // both weapons, req 1/4
    p.combatXp = { atk: 50_000, def: 50_000 }; // enough Attack for rune_dart (req 4)
    applyCommand(state, p.id, { type: 'equip', itemId: 'adamant_dart' });
    applyCommand(state, p.id, { type: 'equip', itemId: 'rune_dart' }); // swap
    expect(p.worn?.['weapon']).toBe('rune_dart');
    expect(p.inventory['adamant_dart']).toBe(1); // the old weapon came back
    expect(p.inventory['rune_dart'] ?? 0).toBe(0);
    checkInvariants(state);
  });

  it('rejects equipping what you do not own / is not gear / is over your level', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, { shark: 1, rune_2h_sword: 1 }); // consumable + req-14 weapon
    expect(applyCommand(state, p.id, { type: 'equip', itemId: 'adamant_dart' }).reason).toBe('not-owned');
    expect(applyCommand(state, p.id, { type: 'equip', itemId: 'shark' }).reason).toBe('not-equippable');
    expect(applyCommand(state, p.id, { type: 'equip', itemId: 'rune_2h_sword' }).reason).toBe('level-too-low');
  });

  it('deriveStats: worn gear overrides the pack per slot', () => {
    const lv = { atk: 99, def: 99 };
    const packOnly = deriveStats({ adamant_dart: 1 }, lv); // weapon atk 10
    const wornWins = deriveStats({ adamant_dart: 1 }, lv, { weapon: 'dragon_dart' }); // worn atk 26
    expect(wornWins.atk).toBeGreaterThan(packOnly.atk);
  });
});
