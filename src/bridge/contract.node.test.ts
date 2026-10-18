import { describe, expect, it } from 'vitest';
import { normalizeFormula, parseReply, parseSheetRoll, rollFlavor, SHEET_CAPABILITIES, withAdvantage } from './contract.ts';

describe('sheet roll boundary', () => {
  it('keeps the sheet feature and character, strips controls and preserves a complete formula', () => {
    const roll = parseSheetRoll({ site: 'dndbeyond', character: 'Mira\nThorn', name: 'Longsword — Damage', formula: ' 2d6 + 1d4 − 2 ' });
    expect(roll).toEqual({ site: 'dndbeyond', character: 'Mira Thorn', name: 'Longsword — Damage', formula: '2d6+1d4-2' });
    expect(rollFlavor(roll!)).toBe('Mira Thorn · Longsword — Damage');
  });

  it('refuses ambiguous text, huge dice pools, unsupported dice and incomplete expressions', () => {
    for (const formula of ['d20 + proficiency', '101d6', '0d20', '1d0', '1d1001', 'd20+', 'd20;alert(1)', '1d6/0', 'd20 5', '1d6+1000000000']) {
      expect(normalizeFormula(formula), formula).toBeNull();
    }
    expect(normalizeFormula('2d20kh1+5')).toBe('2d20kh1+5');
    expect(normalizeFormula('d12+d12+2')).toBe('d12+d12+2');
    expect(normalizeFormula('50d6+51d4')).toBeNull();
    expect(parseSheetRoll({ site: 'bad site', name: 'Attack', character: 'Mira', formula: 'd20' })).toBeNull();
    expect(parseSheetRoll({ site: 'demiplane', name: '', character: 'Mira', formula: 'd20' })).toBeNull();
  });

  it('keeps a modifier unresolved for the GM and rejects ambiguous constant expressions', () => {
    for (const [input, formula] of [['+2', '+2'], ['−1', '-1'], ['0', '+0'], [' 7 ', '+7']]) {
      expect(parseSheetRoll({ site: 'custom-sheet', character: 'Mira', name: 'Agility', formula: input })?.formula).toBe(formula);
    }
    for (const input of ['+10000', '2+3', '', '2 3', 'NaN']) expect(normalizeFormula(input)).toBeNull();
  });

  it('accepts independent sheet services without an Atlas allowlist', () => {
    const roll = { site: 'my-sheet-2', name: 'Spear damage', character: 'Mira', formula: 'd8+3' };
    expect(parseSheetRoll(roll)).toEqual(roll);
    for (const site of ['', 'MySheet', '-sheet', 'sheet-', 'sheet--name', 'https://sheet.example', 'a'.repeat(65), null]) {
      expect(parseSheetRoll({ ...roll, site }), String(site)).toBeNull();
    }
  });

  it('preserves additive error codes while accepting older replies', () => {
    expect(parseReply({ ok: false, code: 'not-ready', error: 'Connect your GM.' })).toEqual({ ok: false, code: 'not-ready', error: 'Connect your GM.' });
    expect(parseReply({ ok: false, error: 'Connect your GM.' })).toEqual({ ok: false, error: 'Connect your GM.' });
  });

  it('reads capability limits without leaking extra fields or trusting malformed limits', () => {
    expect(parseReply({ ok: true, available: false, capabilities: { ...SHEET_CAPABILITIES, secret: 'not part of the API' } })).toEqual({ ok: true, available: false, capabilities: SHEET_CAPABILITIES });
    for (const capabilities of [{ ...SHEET_CAPABILITIES, version: 2 }, { ...SHEET_CAPABILITIES, maxDice: 0 }, { version: 1 }, { ...SHEET_CAPABILITIES, maxNameLength: '200' }]) {
      expect(parseReply({ ok: true, available: true, capabilities })).toEqual({ ok: true, available: true });
    }
  });

  it('uses keep-highest/lowest only on a single d20 term', () => {
    expect(withAdvantage('1d20+5+1d4', 'advantage')).toBe('2d20kh1+5+1d4');
    expect(withAdvantage('d20-1', 'disadvantage')).toBe('2d20kl1-1');
    expect(withAdvantage('2d20kh1+4', 'disadvantage')).toBe('2d20kh1+4');
    expect(withAdvantage('2d12+2', 'advantage')).toBe('2d12+2');
  });

  it('keeps long feature names legible inside the log limit', () => {
    const roll = parseSheetRoll({ site: 'demiplane', character: 'M'.repeat(60), name: 'F'.repeat(150), formula: 'd8' });
    expect(rollFlavor(roll!)).toHaveLength(120);
    expect(rollFlavor(roll!)).toContain('F'.repeat(80));
  });
});

 it('carries an optional request for the GM dice appearance, never external styles', () => {
  const roll = { site: 'demiplane', character: 'Mira', name: 'Duality Roll', formula: 'd12+d12', setAppearance: true };
  expect(parseSheetRoll({ ...roll, colour: 'red', diceSet: 'someone-else' })).toEqual(roll);
  for (const setAppearance of [false, 'true', {}, 1]) expect(parseSheetRoll({ ...roll, setAppearance })).toBeNull();
 });
