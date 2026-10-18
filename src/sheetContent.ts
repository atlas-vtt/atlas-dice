import { parseReply, parseSheetRoll, type SheetRoll } from './bridge/contract.ts';
import { DDB_CONTROLS, dndBeyondRoll } from './adapters/dndBeyond.ts';
import { installSheetRollClicks } from './sheetClicks.ts';
import { demiplaneControl } from './adapters/demiplane.ts';

function read(control: HTMLElement): SheetRoll | null {
  if (location.hostname === 'www.dndbeyond.com' || location.hostname === 'dndbeyond.com') return dndBeyondRoll(control);
  if (!/^\/nexus\/daggerheart\/(?:character-sheet|character)\//.test(location.pathname)) return null;
  const raw = control.getAttribute('data-atlas-sheet-roll');
  if (raw === null) return null;
  try { return parseSheetRoll(JSON.parse(raw) as unknown); }
  catch { return null; }
}

installSheetRollClicks(document, read, async (roll) => {
  const result: unknown = await chrome.runtime.sendMessage({ kind: 'roll', roll });
  return parseReply(result) ?? { ok: false, error: 'The extension could not read Atlas’s reply.' };
}, (target) => location.hostname === 'app.demiplane.com' ? demiplaneControl(target) : target.closest<HTMLElement>(DDB_CONTROLS));
