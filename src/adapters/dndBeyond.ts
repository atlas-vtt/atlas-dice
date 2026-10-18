import { normalizeFormula, parseSheetRoll, sheetText, type SheetRoll } from '../bridge/contract.ts';

const pair = (name: string): string => `.ct-${name},.ddbc-${name}`;
const text = (root: ParentNode, selector: string): string | null => sheetText(root.querySelector(selector)?.textContent, 150);

/** Native dice buttons, including their classic and current sheet rows. */
export const DDB_CONTROLS = [
  '.integrated-dice__container', '[data-dicenotation]',
  ...['skills__col--modifier', 'saving-throws-summary__ability-modifier'].map(pair),
].join(',');

function descriptor(control: HTMLElement): { name: string } | null {
  const skill = control.closest(pair('skills__item'));
  if (skill !== null) {
    const name = text(skill, pair('skills__col--skill'));
    return name === null ? null : { name: `${name} — Check` };
  }
  const save = control.closest(pair('saving-throws-summary__ability'));
  if (save !== null) {
    const name = text(save, `${pair('saving-throws-summary__ability-name')},${pair('saving-throws-summary__ability-label')},${pair('ability-abbr')}`);
    return name === null ? null : { name: `${name} — Saving throw` };
  }
  const ability = control.closest(pair('ability-summary'));
  if (ability !== null) {
    const name = text(ability, pair('ability-summary__label'));
    return name === null ? null : { name: `${name} — Check` };
  }
  if (control.closest(`${pair('combat__summary-group--initiative')},${pair('combat-tablet__extra--initiative')}`) !== null) return { name: 'Initiative' };
  const attack = control.closest(`${pair('combat-attack')},${pair('spells-spell')}`);
  if (attack !== null) {
    const name = text(attack, `${pair('combat-attack__label')},${pair('spell-name')},[class*='styles_spellName']`);
    const damage = control.closest(`${pair('combat-attack__damage')},${pair('spells-spell__damage')}`) !== null;
    const hit = control.closest(`${pair('combat-attack__tohit')},${pair('spells-spell__tohit')}`) !== null;
    return name === null || (!damage && !hit) ? null : { name: `${name} — ${damage ? 'Damage' : 'Attack'}` };
  }
  const sidebar = control.closest(pair('sidebar'));
  if (sidebar !== null) {
    const name = text(sidebar, pair('sidebar__heading'));
    return name === null ? null : { name };
  }
  return null;
}

/** Explicit sheet dice win; a bare bonus stays unresolved until the GM applies the character's defaults. */
export function dndBeyondRoll(control: HTMLElement): SheetRoll | null {
  const named = descriptor(control);
  if (named === null) return null;
  const character = text(control.ownerDocument, `${pair('character-name')},${pair('character-tidbits__heading')}`);
  const written = control.getAttribute('data-dicenotation') ?? control.textContent ?? '';
  const formula = normalizeFormula(written);
  return parseSheetRoll({ site: 'dndbeyond', character, name: named.name, formula });
}
