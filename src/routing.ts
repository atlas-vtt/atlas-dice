import type { SheetReply, SheetRoll } from './bridge/contract.ts';

export interface AtlasTarget { readonly id: number; readonly label: string; readonly available: boolean; readonly bridge?: boolean }

/** Never broadcast a throw, fall back from an explicitly selected table, or retry an uncertain delivery. */
export async function routeToTable(roll: SheetRoll, targets: readonly AtlasTarget[], selected: number | null, deliver: (id: number, roll: SheetRoll) => Promise<SheetReply>): Promise<SheetReply> {
  const target = selected === null ? targets.length === 1 ? targets[0] : undefined : targets.find((tab) => tab.id === selected);
  if (target === undefined) return { ok: false, error: 'Open the Atlas Dice extension and choose your player table.' };
  if (target.bridge === false) return { ok: false, code: 'no-bridge', error: 'Reload your Atlas player tab. If it still cannot receive sheet rolls, it needs the player-page update.' };
  if (!target.available) return { ok: false, code: 'not-ready', error: 'Your selected Atlas table needs a connected GM and a scene.' };
  try { return await deliver(target.id, roll); }
  catch { return { ok: false, error: 'Delivery is uncertain. Check the Atlas log before rolling again.' }; }
}
