import { normalizeFormula, record, sheetText } from '../bridge/contract.ts';
import { engineRoll } from './demiplaneEngine.ts';

export interface NamedFormula {
  readonly formula: string;
  readonly name: string;
  readonly setAppearance?: true;
}

/** The current sheet's nested text blocks are labels inside its actual rollable container. */
export function demiplaneControl(target: Element): HTMLElement | null {
  return target.closest<HTMLElement>('.element-rollable') ?? target.closest<HTMLElement>('button,[role="button"],.dice-roll-button') ?? target.closest<HTMLElement>('.text-block,.small-element');
}

/** The legacy sheet's diceParameters, and the engine's explicit clickHandlers dice action. */
export function demiplaneParameters(props: unknown): NamedFormula | null {
  if (!record(props)) return null;
  let parameters: unknown = props.diceParameters;
  if (!record(parameters) && record(props.clickHandlers) && record(props.clickHandlers.dice)) {
    const rolls: unknown = props.clickHandlers.dice.dice;
    if (Array.isArray(rolls) && rolls.length === 1) parameters = rolls[0] as unknown;
  }
  if (!record(parameters)) return null;
  const formula = normalizeFormula(parameters.dice);
  const feature = sheetText(parameters.name, 150);
  const origin = sheetText(parameters.origin, 40);
  if (formula === null || feature === null) return null;
  const setAppearance = [origin, feature].some((label) => label !== null && /^(?:Trait|Trait Roll|Duality|Duality Roll)$/i.test(label));
  return { formula, ...(setAppearance && { setAppearance: true }), name: origin === null || feature === origin ? feature : `${feature} · ${origin}` };
}

/** Read only the sheet's resolved roll props. No handler is called, and no React state is changed. */
export function demiplaneRoll(element: HTMLElement, finalOnly = false): NamedFormula | null {
  const config = diceConfig(element.ownerDocument);
  const key = Object.keys(element).find((name) => name.startsWith('__reactFiber$'));
  if (key === undefined) return null;
  let fiber: unknown = (element as unknown as Record<string, unknown>)[key];
  for (let depth = 0; depth < 16 && record(fiber); depth += 1) {
    const props: unknown = fiber.memoizedProps;
    const final = record(props) && record(props.events) && record(props.events.roll);
    const named = demiplaneParameters(props) ?? (!finalOnly || final ? engineRoll(props, config) : null);
    if (named !== null) return named;
    fiber = fiber.return;
  }
  return null;
}

/** Stop inside the dice roller: no character or account context is inspected. */
function diceConfig(doc: Document): unknown {
  const root = doc.querySelector('.dice-roller');
  if (root === null) return null;
  const key = Object.keys(root).find((name) => name.startsWith('__reactFiber$'));
  let fiber: unknown = key === undefined ? null : (root as unknown as Record<string, unknown>)[key];
  for (let depth = 0; depth < 6 && record(fiber); depth += 1) {
    const props: unknown = fiber.memoizedProps;
    if (record(props) && record(props.diceConfig)) return props.diceConfig;
    if (record(props) && Array.isArray(props.dice)) return props;
    fiber = fiber.return;
  }
  return null;
}
