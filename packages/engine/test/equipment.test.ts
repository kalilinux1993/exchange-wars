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

  it('equipBest equips the best usable piece in every slot at once', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, {
      adamant_dart: 1, // weapon atk 10
      rune_2h_sword: 1, // weapon atk 45 — best weapon
      rune_chainbody: 1, // body def 22
      rune_platebody: 1, // body def 28 — best body
    });
    p.combatXp = { atk: 50_000, def: 50_000 }; // 99/99 — everything usable
    const r = applyCommand(state, p.id, { type: 'equipBest' });
    expect(r.ok).toBe(true);
    expect(p.worn?.['weapon']).toBe('rune_2h_sword');
    expect(p.worn?.['body']).toBe('rune_platebody');
    // the worse pieces stay in the satchel; the best ones left it
    expect(p.inventory['adamant_dart']).toBe(1);
    expect(p.inventory['rune_chainbody']).toBe(1);
    expect(p.inventory['rune_2h_sword'] ?? 0).toBe(0);
    expect(p.inventory['rune_platebody'] ?? 0).toBe(0);
    checkInvariants(state);
  });

  it('equipBest skips gear above your level', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, { adamant_dart: 1, rune_2h_sword: 1 });
    p.combatXp = { atk: 64, def: 64 }; // level 5 — adamant_dart req 1 ok, rune_2h_sword req 14 inert
    const r = applyCommand(state, p.id, { type: 'equipBest' });
    expect(r.ok).toBe(true);
    expect(p.worn?.['weapon']).toBe('adamant_dart');
    expect(p.inventory['rune_2h_sword']).toBe(1); // too high a level, left behind
    checkInvariants(state);
  });

  it('equipBest upgrades a worn slot and returns the old piece', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, { adamant_dart: 1, rune_2h_sword: 1 });
    p.combatXp = { atk: 50_000, def: 50_000 };
    applyCommand(state, p.id, { type: 'equip', itemId: 'adamant_dart' }); // wear the weak weapon
    const r = applyCommand(state, p.id, { type: 'equipBest' });
    expect(r.ok).toBe(true);
    expect(p.worn?.['weapon']).toBe('rune_2h_sword');
    expect(p.inventory['adamant_dart']).toBe(1); // the displaced weapon came back
    expect(p.inventory['rune_2h_sword'] ?? 0).toBe(0);
    checkInvariants(state);
  });

  it('equipBest is a rejected no-op when nothing improves', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, { rune_2h_sword: 1 });
    p.combatXp = { atk: 50_000, def: 50_000 };
    expect(applyCommand(state, p.id, { type: 'equipBest' }).ok).toBe(true);
    const again = applyCommand(state, p.id, { type: 'equipBest' }); // already optimal
    expect(again.ok).toBe(false);
    expect(again.reason).toBe('no-upgrade');
    expect(p.worn?.['weapon']).toBe('rune_2h_sword');
    checkInvariants(state);
  });

  it('equipBest resolves stat-ties deterministically by smaller itemId', () => {
    const state = createWorld({ seed: 1 });
    // rune_plateskirt and rune_platelegs are both legs, def 20, req 10 — a stat tie.
    const p = addAgent(state, 'player', 50_000, { rune_plateskirt: 1, rune_platelegs: 1 });
    p.combatXp = { atk: 50_000, def: 50_000 };
    const r = applyCommand(state, p.id, { type: 'equipBest' });
    expect(r.ok).toBe(true);
    expect(p.worn?.['legs']).toBe('rune_platelegs'); // smaller itemId wins (legs < skirt)
    checkInvariants(state);
  });

  it('equipBest is rejected mid-expedition', () => {
    const state = createWorld({ seed: 1 });
    const p = addAgent(state, 'player', 50_000, { rune_2h_sword: 2, shark: 4, adamant_dart: 1 });
    p.combatXp = { atk: 50_000, def: 50_000 };
    const started = applyCommand(state, p.id, {
      type: 'startExpedition',
      regionId: 'lumbridge_plains',
      pack: { rune_2h_sword: 1, shark: 4 },
    });
    expect(started.ok).toBe(true);
    const r = applyCommand(state, p.id, { type: 'equipBest' });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('on-expedition');
  });
});
