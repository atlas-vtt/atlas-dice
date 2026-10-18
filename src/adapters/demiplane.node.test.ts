import { describe, expect, it } from 'vitest';
import { demiplaneParameters } from './demiplane.ts';

describe('Demiplane explicit roll parameters', () => {
  it('reads the exact formula, feature and origin the sheet passes to its dice roller', () => {
    expect(demiplaneParameters({ diceParameters: { dice: '2d12+3', name: 'Agility', origin: 'Trait' } })).toEqual({ formula: '2d12+3', name: 'Agility · Trait', setAppearance: true });
    expect(demiplaneParameters({ clickHandlers: { dice: { dice: [{ dice: '2d8+4', name: 'Longbow', origin: 'Damage' }] } } })).toEqual({ formula: '2d8+4', name: 'Longbow · Damage' });
  });

  it('does not guess an unnamed formula or merge several distinct rolls', () => {
    expect(demiplaneParameters({ diceParameters: { dice: '2d12+3' } })).toBeNull();
    expect(demiplaneParameters({ clickHandlers: { dice: { dice: [{ dice: 'd20', name: 'Attack' }, { dice: 'd8', name: 'Damage' }] } } })).toBeNull();
    expect(demiplaneParameters({ diceParameters: { dice: 'unknown', name: 'Agility' } })).toBeNull();
  });
});

it('recognizes a legacy generic duality roll without dressing damage dice', () => {
  expect(demiplaneParameters({ diceParameters: { dice: '2d12', name: 'Duality Roll', origin: 'Custom Roll' } })).toEqual({ formula: '2d12', name: 'Duality Roll · Custom Roll', setAppearance: true });
  expect(demiplaneParameters({ diceParameters: { dice: '2d12', name: 'Longbow', origin: 'Damage' } })).toEqual({ formula: '2d12', name: 'Longbow · Damage' });
});
