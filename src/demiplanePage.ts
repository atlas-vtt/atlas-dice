import { sheetText } from './bridge/contract.ts';
import { demiplaneControl, demiplaneRoll } from './adapters/demiplane.ts';

/** MAIN world is needed only to read resolved roll props, which isolated content scripts cannot see. */
function prepare(event: Event): void {
  if (!/^\/nexus\/daggerheart\/(?:character-sheet|character)\//.test(location.pathname) || !(event.target instanceof HTMLElement)) return;
  const control = event.type === 'atlas-sheet-read' ? event.target : demiplaneControl(event.target);
  if (control === null) return;
  const roll = demiplaneRoll(control, true);
  const character = sheetText(document.querySelector('.character-name')?.textContent, 60);
  if (roll === null || character === null) {
    control.removeAttribute('data-atlas-sheet-roll');
    return;
  }
  const value = JSON.stringify({ site: 'demiplane', character, ...roll });
  if (control.getAttribute('data-atlas-sheet-roll') !== value) control.setAttribute('data-atlas-sheet-roll', value);
}

for (const event of ['pointerover', 'focusin', 'atlas-sheet-read']) document.addEventListener(event, prepare, true);
