import { normalizeFormula, record, sheetText } from '../bridge/contract.ts';
import type { NamedFormula } from './demiplane.ts';

const list = (value: unknown): unknown[] => value === undefined ? [] : Array.isArray(value) ? value as unknown[] : [value];

/** Resolve slugs through the sheet's own dice definitions, including its negative disadvantage dice. */
export function enginePool(groups: unknown, config: unknown): string | null {
  if (!Array.isArray(groups) || groups.length > 10 || !record(config) || !Array.isArray(config.dice)) return null;
  const definitions: unknown[] = config.dice;
  const mappings = list(config.dieResultMappings);
  const terms: string[] = [];
  for (const group of groups as unknown[]) {
    if (!record(group) || !Array.isArray(group.dice) || group.dice.length > 100) return null;
    for (const die of group.dice as unknown[]) {
      if (!record(die) || typeof die.slug !== 'string') return null;
      const definition = definitions.find((value) => record(value) && value.slug === die.slug);
      const notation: unknown = typeof die.die === 'string' && die.die !== '' ? die.die : record(definition) ? definition.die : undefined;
      if (typeof notation !== 'string' || !/^d\d{1,4}$/.test(notation)) return null;
      const count = die.dieCount ?? 1;
      if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 1 || count > 100) return null;
      let term = `${count === 1 ? '' : count}${notation}`;
      if (die.type !== undefined && die.type !== '') {
        if (die.type !== 'kh' && die.type !== 'kl') return null;
        const keep = die.keepCount;
        if (typeof keep !== 'number' || !Number.isSafeInteger(keep) || keep < 1 || keep > count) return null;
        term += `${die.type}${keep}`;
      }
      const negative = mappings.some((value) => record(value) && value.dieSlug === die.slug && value.isNegative === true);
      terms.push(`${negative ? '-' : terms.length === 0 ? '' : '+'}${term}`);
    }
  }
  return normalizeFormula(terms.join(''));
}

function named(formula: string | null, names: readonly unknown[], bonus: number, groups: unknown): NamedFormula | null {
  const feature = sheetText(names[1], 150) ?? sheetText(names[0], 150);
  const origin = sheetText(names[0], 40);
  if (formula === null || feature === null || !Number.isSafeInteger(bonus)) return null;
  const complete = normalizeFormula(`${formula}${bonus === 0 ? '' : bonus > 0 ? `+${bonus}` : bonus}`);
  return complete === null ? null : { formula: complete, name: origin === null || origin === feature ? feature : `${feature} · ${origin}`, ...(dualityPool(groups) && { setAppearance: true }) };
}

/** Current resolved engine actions, and the live roll panel after the player adjusts its modifiers. */
export function engineRoll(props: unknown, config: unknown): NamedFormula | null {
  if (!record(props)) return null;
  if (record(props.events) && record(props.events.roll) && props.events.roll.includePool === true && record(props.systemDiceState) && record(props.systemDiceState.value)) {
    const state: unknown = props.systemDiceState.value.currentState;
    if (!record(state) || !record(state.modifiers)) return null;
    const names = list(state.modifiers.rollName).map((value) => record(value) ? value.value : undefined);
    let bonus = 0;
    for (const option of list(props.events.roll.modifierOptions)) {
      if (!record(option) || option.purpose === 'misc') continue;
      if (option.purpose !== 'add' || typeof option.store !== 'string' || typeof option.index !== 'number') return null;
      const modifier = list(state.modifiers[option.store])[option.index];
      if (!record(modifier) || typeof modifier.value !== 'number') return null;
      bonus += modifier.value;
    }
    return named(enginePool(state.pool, state), names, bonus, state.pool);
  }
  if (!record(props.clickHandlers) || !record(props.clickHandlers.diceEvents)) return null;
  const events: unknown = props.clickHandlers.diceEvents.events;
  if (!record(events) || !list(events.clearValues).some((value) => record(value) && value.at === 'start' && value.pool === true)) return null;
  const groups: unknown[] = [];
  for (const add of list(events.addToPool)) {
    if (!record(add) || !Array.isArray(add.groups)) return null;
    groups.push(...add.groups as unknown[]);
  }
  const names: unknown[] = [];
  let bonus = 0;
  for (const modifier of list(events.updateModifier)) {
    if (!record(modifier) || (modifier.mode !== undefined && modifier.mode !== '') || (modifier.pool !== undefined && modifier.pool !== '')) return null;
    if (modifier.store === 'rollName' && typeof modifier.index === 'number' && modifier.index >= 0 && modifier.index <= 1) names[modifier.index] = modifier.value;
    else if (modifier.store === 'static') {
      if (typeof modifier.value !== 'number') return null;
      bonus += modifier.value;
    } else if (modifier.store !== 'rollType' && modifier.store !== 'showExtraDice') return null;
  }
  return named(enginePool(groups, config), names, bonus, groups);
}

/** Only the actual default duality pool opts in; two ordinary damage d12s do not. */
function dualityPool(groups: unknown): boolean {
  if (!Array.isArray(groups)) return false;
  const first: unknown = groups[0];
  if (!record(first) || !Array.isArray(first.dice)) return false;
  const dice: unknown[] = first.dice;
  return ['hope', 'fear'].every((slug, i) => {
    const die: unknown = dice[i];
    return record(die) && die.slug === slug && (die.dieCount === undefined || die.dieCount === 1) && (die.type === undefined || die.type === '');
  });
}
