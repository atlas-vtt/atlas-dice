import { withAdvantage, type SheetReply, type SheetRoll } from './bridge/contract.ts';
import { DDB_CONTROLS } from './adapters/dndBeyond.ts';

const EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click', 'keydown', 'keyup'];

/** Capture native roll actions before sheet handlers. Alt-click leaves the sheet in charge. */
export function installSheetRollClicks(
  doc: Document,
  read: (control: HTMLElement) => SheetRoll | null,
  send: (roll: SheetRoll) => Promise<SheetReply>,
  findControl: (target: Element) => HTMLElement | null = (target) => target.closest<HTMLElement>(DDB_CONTROLS),
): () => void {
  const win = doc.defaultView;
  if (win === null) return () => undefined;
  const pending = new WeakSet<HTMLElement>();
  const status = doc.createElement('div');
  status.className = 'atlas-sheet-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const say = (text: string, dismiss = false): void => {
    if (disposed) return;
    if (!status.isConnected) (doc.body ?? doc.documentElement).append(status);
    status.textContent = text;
    clearTimeout(timer);
    if (dismiss) timer = setTimeout(() => { status.textContent = ''; }, 8000);
  };
  const perform = async (control: HTMLElement, current: SheetRoll, event: Event): Promise<void> => {
    pending.add(control);
    const keys = event instanceof MouseEvent || event instanceof KeyboardEvent ? event : null;
    const mode = keys?.shiftKey ? 'advantage' : keys?.ctrlKey || keys?.metaKey ? 'disadvantage' : 'normal';
    const formula = withAdvantage(current.formula, mode);
    say(`Sending ${current.name} to Atlas…`);
    try {
      const reply = await send({ ...current, formula });
      say(reply.ok ? `Sent ${current.name} (${formula}) to Atlas.` : reply.error, reply.ok);
    } catch { say('Atlas could not be reached. Check the extension and your player tab.'); }
    finally { pending.delete(control); }
  };
  const intercept = (event: Event): void => {
    if ('altKey' in event && event.altKey === true) return;
    if (event instanceof MouseEvent && event.button !== 0) return;
    const keyboard = event instanceof KeyboardEvent;
    if (keyboard && event.key !== 'Enter' && event.key !== ' ') return;
    const target = event.target instanceof Element ? event.target : event.target instanceof Node ? event.target.parentElement : null;
    const control = target === null ? null : findControl(target);
    if (control === null || control.matches(':disabled,[aria-disabled="true"]') || control.closest('[inert]') !== null) return;
    control.dispatchEvent(new Event('atlas-sheet-read', { bubbles: true }));
    const current = read(control);
    if (current === null && !pending.has(control)) return;
    event.stopImmediatePropagation();
    // Press events retain browser focus and touch-to-click behavior, but never reach sheet handlers.
    if (event.type !== 'click' && !keyboard) return;
    event.preventDefault();
    if (event.type === 'keyup' || (keyboard && event.repeat) || pending.has(control) || current === null) return;
    void perform(control, current, event);
  };
  for (const type of EVENTS) win.addEventListener(type, intercept, true);
  return () => {
    disposed = true;
    for (const type of EVENTS) win.removeEventListener(type, intercept, true);
    clearTimeout(timer);
    status.remove();
  };
}
