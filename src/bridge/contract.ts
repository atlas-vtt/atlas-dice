/** The only data read from a sheet. No account, character id, URL or Atlas credentials cross this boundary. */
export interface SheetRoll {
  readonly site: string;
  readonly character: string;
  readonly name: string;
  readonly formula: string;
  /** Use the GM’s appearance for an explicit matching default pool. */
  readonly setAppearance?: true;
}

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Bounded visible text; never HTML. */
export function sheetText(value: unknown, limit: number): string | null {
  if (typeof value !== 'string' || value.length > limit * 4) return null;
  const clean = value.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim();
  return clean !== '' && [...clean].length <= limit ? clean : null;
}

/** A deliberately small subset of Atlas notation: dice, keep, explosions, and signed constants. */
export function normalizeFormula(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 400 || /[\da-z]\s+[\da-z]/i.test(value)) return null;
  const formula = value.replaceAll('−', '-').replace(/\s+/g, '').toLowerCase();
  if (formula.length === 0 || formula.length > 100) return null;
  if (/^[+-]?\d{1,4}$/.test(formula)) return /^[+-]/.test(formula) ? formula : `+${formula}`;
  const die = String.raw`\d*d(?:[1-9]\d{0,3}|%)(?:!!?(?:\d{1,2}|i)?)?(?:k[hl]\d{1,3})?`;
  const term = `(?:${die}|\\d{1,8})`;
  if (!new RegExp(`^[+-]?${term}(?:[+-]${term})*$`).test(formula)) return null;
  let count = 0;
  for (const match of formula.matchAll(/(\d*)d(\d+|%)(?:!!?(?:\d{1,2}|i)?)?(?:k[hl](\d+))?/g)) {
    const n = match[1] === '' ? 1 : Number(match[1]);
    const faces = match[2] === '%' ? 100 : Number(match[2]);
    const keep = match[3] === undefined ? n : Number(match[3]);
    if (n < 1 || faces > 1000 || keep < 1 || keep > n) return null;
    count += n;
  }
  return count > 0 && count <= 100 ? formula : null;
}

export function parseSheetRoll(value: unknown): SheetRoll | null {
  if (!record(value) || !isSlug(value.site) || (value.setAppearance !== undefined && value.setAppearance !== true)) return null;
  const character = sheetText(value.character, 60);
  const name = sheetText(value.name, 200);
  const formula = normalizeFormula(value.formula);
  return character === null || name === null || formula === null ? null : { site: value.site, character, name, formula, ...(value.setAppearance === true && { setAppearance: true }) };
}

/** Give the feature most of the log's 120 characters; retain the sheet character alongside it. */
export function rollFlavor(roll: SheetRoll): string {
  const feature = [...roll.name].slice(0, 90).join('');
  const character = [...roll.character].slice(0, 120 - [...feature].length - 3).join('');
  return `${character} · ${feature}`;
}

/** Shift / Control on an Atlas button; already qualified rolls and other dice keep their meaning. */
export function withAdvantage(formula: string, mode: 'normal' | 'advantage' | 'disadvantage'): string {
  if (mode === 'normal') return formula;
  return formula.replace(/^(?:1)?d20(?=$|[+-])/, mode === 'advantage' ? '2d20kh1' : '2d20kl1');
}

export const SHEET_CHANNEL = 'atlas-sheet-rolls/v1';

export interface SheetCapabilities {
  readonly version: number;
  readonly maxDice: number;
  readonly maxFormulaLength: number;
  readonly maxCharacterLength: number;
  readonly maxNameLength: number;
  readonly maxSiteLength: number;
  readonly maxRollsPerSecond: number;
  readonly deduplicationEntries: number;
}

export const SHEET_CAPABILITIES: SheetCapabilities = Object.freeze({
  version: 1, maxDice: 100, maxFormulaLength: 100, maxCharacterLength: 60,
  maxNameLength: 200, maxSiteLength: 64, maxRollsPerSecond: 10, deduplicationEntries: 128,
});

function isSlug(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 64 && /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value);
}

function parseCapabilities(value: unknown): SheetCapabilities | undefined {
  if (!record(value) || value.version !== 1) return undefined;
  const { version, maxDice, maxFormulaLength, maxCharacterLength, maxNameLength, maxSiteLength, maxRollsPerSecond, deduplicationEntries } = value;
  if (typeof maxDice !== 'number' || typeof maxFormulaLength !== 'number' || typeof maxCharacterLength !== 'number'
    || typeof maxNameLength !== 'number' || typeof maxSiteLength !== 'number' || typeof maxRollsPerSecond !== 'number' || typeof deduplicationEntries !== 'number') return undefined;
  if (![maxDice, maxFormulaLength, maxCharacterLength, maxNameLength, maxSiteLength, maxRollsPerSecond, deduplicationEntries].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 1_000_000)) return undefined;
  return { version, maxDice, maxFormulaLength, maxCharacterLength, maxNameLength, maxSiteLength, maxRollsPerSecond, deduplicationEntries };
}

export type SheetReply =
  | { readonly ok: true; readonly available: boolean; readonly capabilities?: SheetCapabilities }
  | { readonly ok: false; readonly error: string; readonly code?: string };

export function parseReply(value: unknown): SheetReply | null {
  if (!record(value)) return null;
  if (value.ok === true && typeof value.available === 'boolean') {
    const capabilities = parseCapabilities(value.capabilities);
    return { ok: true, available: value.available, ...(capabilities !== undefined && { capabilities }) };
  }
  return value.ok === false && typeof value.error === 'string' && value.error.length <= 200
    ? { ok: false, error: value.error, ...(isSlug(value.code) && { code: value.code }) } : null;
}

export const isRequestId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9-]{16,64}$/.test(value);
