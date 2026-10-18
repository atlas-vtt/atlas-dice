import { record } from './bridge/contract.ts';
import type { AtlasTarget } from './routing.ts';

const version = document.querySelector<HTMLElement>('.version');
if (version !== null) version.textContent = chrome.runtime.getManifest().version;


const select = document.querySelector<HTMLSelectElement>('#target');
const status = document.querySelector<HTMLElement>('#status');
const refresh = document.querySelector<HTMLButtonElement>('#refresh');
if (select === null || status === null || refresh === null) throw new Error('Atlas Dice popup is incomplete.');
const fields = { select, status, refresh };

function parseTargets(value: unknown): AtlasTarget[] {
  if (!Array.isArray(value)) return [];
  return value.filter((tab: unknown): tab is AtlasTarget => record(tab) && typeof tab.id === 'number' && typeof tab.label === 'string' && typeof tab.available === 'boolean');
}

async function load(): Promise<void> {
  fields.refresh.disabled = true;
  try {
    const reply: unknown = await chrome.runtime.sendMessage({ kind: 'targets' });
    if (!record(reply)) throw new Error('No reply');
    const targets = parseTargets(reply.targets);
    const selected: unknown = reply.selected;
    fields.select.replaceChildren();
    const automatic = document.createElement('option');
    automatic.value = '';
    automatic.textContent = 'Automatic · one open table';
    fields.select.append(automatic);
    for (const tab of targets) {
      const option = document.createElement('option');
      option.value = String(tab.id);
      option.textContent = `${tab.label} · ${tab.available ? 'Ready' : 'Not ready'} · tab ${tab.id}`;
      fields.select.append(option);
    }
    if (typeof selected === 'number' && !targets.some((tab) => tab.id === selected)) {
      const missing = document.createElement('option');
      missing.value = String(selected);
      missing.textContent = 'Selected table has closed';
      fields.select.append(missing);
    }
    fields.select.value = typeof selected === 'number' ? String(selected) : '';
    const chosen = selected === null && targets.length === 1 ? targets[0] : targets.find((tab) => tab.id === selected);
    fields.status.textContent = chosen?.available === true ? 'Ready. Your next roll goes to this table.'
      : targets.length === 0 ? 'Open your Atlas player table, then refresh.'
      : chosen?.bridge === false ? 'Reload your Atlas player tab. If it still cannot receive sheet rolls, it needs the player-page update.'
      : selected === null && targets.length > 1 ? 'Choose a table before rolling.' : 'Your table needs a connected GM and a scene.';
  } catch { fields.status.textContent = 'Tables could not be read. Try refreshing.'; }
  finally { fields.refresh.disabled = false; }
}

fields.select.addEventListener('change', () => {
  void chrome.runtime.sendMessage({ kind: 'select', id: fields.select.value === '' ? null : Number(fields.select.value) }).then(load).catch(() => { fields.status.textContent = 'The table selection could not be saved.'; });
});
fields.refresh.addEventListener('click', () => { void load(); });
void load();
