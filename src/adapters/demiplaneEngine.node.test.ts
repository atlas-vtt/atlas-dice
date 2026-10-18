import { describe, expect, it } from 'vitest';
import { engineRoll, enginePool } from './demiplaneEngine.ts';

/** Reduced resolved structures verified on the live public Daggerheart sheet, 2026-10-16. */
const config = { dice: [{ slug: 'hope', die: 'd12' }, { slug: 'fear', die: 'd12' }, { slug: 'd8', die: 'd8' }, { slug: 'disadvantage', die: 'd6' }], dieResultMappings: [{ dieSlug: 'disadvantage', isNegative: true }] };
const pool = [{ dice: [{ slug: 'hope', die: '' }, { slug: 'fear', die: '' }], slug: 'custom', label: 'custom' }];
const events = {
  clearValues: [{ at: 'start', pool: true }], newState: 'open', addToPool: { groups: pool },
  updateModifier: [{ store: 'rollName', index: 0, mode: '', value: 'Trait Roll', pool: '' }, { store: 'rollName', index: 1, mode: '', value: 'Agility', pool: '' }, { store: 'static', index: 0, mode: '', value: 1, pool: '' }],
};

describe('current Demiplane Daggerheart engine', () => {
  it('resolves the sheet’s Hope and Fear slugs and the trait’s actual modifier and name', () => {
    expect(engineRoll({ clickHandlers: { diceEvents: { events } } }, config)).toEqual({ formula: 'd12+d12+1', name: 'Agility · Trait Roll', setAppearance: true });
  });

  it('keeps damage counts, keep rules and negative dice instead of guessing from display text', () => {
    expect(enginePool([{ dice: [{ slug: 'd8', dieCount: 3 }, { slug: 'disadvantage' }] }], config)).toBe('3d8-d6');
    expect(enginePool([{ dice: [{ slug: 'd8', dieCount: 2, type: 'kh', keepCount: 1 }] }], config)).toBe('2d8kh1');
    expect(enginePool([{ dice: [{ slug: 'unknown' }] }], config)).toBeNull();
    expect(enginePool([{ dice: [{ slug: 'd8', dieCount: 101 }] }], config)).toBeNull();
  });

  it('refuses an action which only alters an existing pool or has unresolved modifiers', () => {
    expect(engineRoll({ clickHandlers: { diceEvents: { events: { ...events, clearValues: [] } } } }, config)).toBeNull();
    expect(engineRoll({ clickHandlers: { diceEvents: { events: { ...events, updateModifier: [{ store: 'static', value: 'unresolved' }] } } } }, config)).toBeNull();
  });

  it('reads the current roll panel after experiences or modifiers changed', () => {
    const props = {
      events: { roll: { includePool: true, modifierOptions: [{ store: 'static', index: 0, purpose: 'add' }, { store: 'rollName', index: 0, purpose: 'misc' }, { store: 'rollName', index: 1, purpose: 'misc' }] } },
      systemDiceState: { value: { currentState: { ...config, pool, modifiers: { static: [{ value: 5 }], rollName: [{ value: 'Trait Roll' }, { value: 'Agility' }] } } } },
    };
    expect(engineRoll(props, config)).toEqual({ formula: 'd12+d12+5', name: 'Agility · Trait Roll', setAppearance: true });
  });

  it('names generic Duality from its first name slot and retains extra dice and modifiers', () => {
    // Live generic Duality uses rollName[0]; trait rolls also fill rollName[1].
    const state = { ...config, pool: structuredClone(pool), modifiers: { static: [{ value: 0 }], rollName: [{ value: 'Duality Roll', pool: '' }, { value: '' }] } };
    const props = {
      events: { roll: { includePool: true, nameCalculation: { static: 'Custom Roll' }, modifierOptions: [{ store: 'static', index: 0, purpose: 'add' }, { store: 'rollName', index: 0, purpose: 'misc' }, { store: 'rollName', index: 1, purpose: 'misc' }] } },
      systemDiceState: { value: { currentState: state } },
    };
    expect(engineRoll(props, config)).toEqual({ formula: 'd12+d12', name: 'Duality Roll', setAppearance: true });
    state.pool.push({ dice: [{ slug: 'd8', die: 'd8' }], slug: 'extra', label: 'extra' });
    state.modifiers.static[0]!.value = 3;
    expect(engineRoll(props, config)).toEqual({ formula: 'd12+d12+d8+3', name: 'Duality Roll', setAppearance: true });
    state.modifiers.rollName[0]!.value = '';
    expect(engineRoll(props, config)).toBeNull();
  });
});

it('does not mark an ordinary damage pool, even if it also rolls two d12s', () => {
  const damage = { ...events, addToPool: { groups: [{ dice: [{ slug: 'd12', die: 'd12', dieCount: 2 }] }] } };
  expect(engineRoll({ clickHandlers: { diceEvents: { events: damage } } }, config)).toEqual({ formula: '2d12+1', name: 'Agility · Trait Roll' });
});
