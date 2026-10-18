import { parseReply, parseSheetRoll, record, type SheetReply } from './bridge/contract.ts';
import { routeToTable, type AtlasTarget } from './routing.ts';
function isSheet(url: string | undefined): boolean {
  if (url === undefined) return false;
  try {
    const page = new URL(url);
    return page.protocol === 'https:' && ((['www.dndbeyond.com', 'dndbeyond.com'].includes(page.hostname) && /\/(?:characters|profile\/[^/]+\/characters)\//.test(page.pathname))
      || (page.hostname === 'app.demiplane.com' && /^\/nexus\/daggerheart\/(?:character-sheet|character)\//.test(page.pathname)));
  } catch { return false; }
}

async function targets(): Promise<AtlasTarget[]> {
  const permissions: unknown = chrome.runtime.getManifest().host_permissions;
  const urls = Array.isArray(permissions) ? permissions.filter((value: unknown): value is string => typeof value === 'string') : [];
  if (urls.length === 0) return [];
  const tabs = await chrome.tabs.query({ url: urls });
  const results = await Promise.all(tabs.map(async (tab): Promise<AtlasTarget | null> => {
    if (tab.id === undefined) return null;
    try {
      const result: unknown = await chrome.tabs.sendMessage(tab.id, { kind: 'probe' });
      const reply = parseReply(result);
      return { id: tab.id, label: tab.title ?? 'Atlas player table', available: reply?.ok === true && reply.available, bridge: reply?.ok === true };
    } catch { return { id: tab.id, label: tab.title ?? 'Atlas player table', available: false, bridge: false }; }
  }));
  return results.filter((tab): tab is AtlasTarget => tab !== null);
}

async function selected(): Promise<number | null> {
  const stored = await chrome.storage.session.get('atlasTarget');
  const value: unknown = stored.atlasTarget;
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

async function handle(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
  if (sender.id !== chrome.runtime.id || !record(message)) return { ok: false, error: 'Unknown request.' };
  const popup = sender.url === chrome.runtime.getURL('popup.html');
  if (popup && message.kind === 'targets') return { targets: await targets(), selected: await selected() };
  if (popup && message.kind === 'select' && (message.id === null || (typeof message.id === 'number' && Number.isSafeInteger(message.id)))) {
    await chrome.storage.session.set({ atlasTarget: message.id });
    return { ok: true, available: true };
  }
  if (message.kind !== 'roll' || !isSheet(sender.tab?.url)) return { ok: false, error: 'Rolls must come from a supported character sheet.' };
  const roll = parseSheetRoll(message.roll);
  if (roll === null) return { ok: false, error: 'This sheet roll has no readable name or formula.' };
  return routeToTable(roll, await targets(), await selected(), async (id, value): Promise<SheetReply> => {
    const reply: unknown = await chrome.tabs.sendMessage(id, { kind: 'roll', roll: value });
    return parseReply(reply) ?? { ok: false, error: 'Delivery is uncertain. Check the Atlas log before rolling again.' };
  });
}

chrome.runtime.onMessage.addListener((message: unknown, sender, reply: (value: unknown) => void): boolean => {
  void handle(message, sender).then(reply).catch(() => reply({ ok: false, error: 'Atlas could not be reached. Check your player tab.' }));
  return true;
});
