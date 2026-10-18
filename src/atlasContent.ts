import { isRequestId, parseReply, record, SHEET_CHANNEL, type SheetReply } from './bridge/contract.ts';

/** One request, one bounded reply. A timed-out roll is never retried automatically. */
function requestPage(kind: 'probe' | 'roll', roll?: unknown): Promise<SheetReply> {
  const id = crypto.randomUUID();
  return new Promise((resolve) => {
    const finish = (reply: SheetReply): void => {
      clearTimeout(timeout);
      window.removeEventListener('message', receive);
      resolve(reply);
    };
    const receive = (event: MessageEvent<unknown>): void => {
      if (event.source !== window || event.origin !== location.origin || !record(event.data)) return;
      if (event.data.channel !== SHEET_CHANNEL || event.data.kind !== 'reply' || !isRequestId(event.data.id) || event.data.id !== id) return;
      const reply = parseReply(event.data.reply);
      if (reply !== null) finish(reply);
    };
    const timeout = setTimeout(() => finish({ ok: false, error: kind === 'roll' ? 'Delivery is uncertain. Check the Atlas log before rolling again.' : 'Reload the Atlas player page to enable sheet rolls.' }), 3000);
    window.addEventListener('message', receive);
    window.postMessage({ channel: SHEET_CHANNEL, id, kind, ...(roll !== undefined && { roll }) }, location.origin);
  });
}

chrome.runtime.onMessage.addListener((message: unknown, sender, reply: (value: SheetReply) => void): boolean => {
  if (sender.id !== chrome.runtime.id || !record(message) || (message.kind !== 'probe' && message.kind !== 'roll')) return false;
  void requestPage(message.kind, message.roll).then(reply);
  return true;
});
