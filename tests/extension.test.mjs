import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { chromium } from 'playwright';
import { unzipSync } from 'fflate';

// Install the downloaded ZIP, not the source tree. All site responses are local fixtures.
test('release ZIP installs and sends native sheet rolls to exactly one Atlas table', { timeout: 90_000 }, async () => {
  const { version } = JSON.parse(await readFile('package.json', 'utf8'));
  const files = unzipSync(await readFile(`release/atlas-dice-${version}.zip`));
  const manifest = JSON.parse(new TextDecoder().decode(files['manifest.json']));
  assert.equal(manifest.version, version);
  assert.deepEqual(manifest.permissions, ['storage']);
  assert.deepEqual(manifest.host_permissions, ['https://play.atlas-vtt.dev/*', 'https://play-staging.atlas-vtt.dev/*']);
  for (const script of manifest.content_scripts) for (const file of [...script.js, ...(script.css ?? [])]) assert.ok(files[file], file);
  const folder = await mkdtemp(path.join(tmpdir(), 'atlas-dice-release-'));
  let browser;
  try {
    const extension = path.join(folder, 'extension');
    for (const [name, bytes] of Object.entries(files)) {
      assert.ok(!path.isAbsolute(name) && !name.split('/').includes('..'));
      const output = path.join(extension, name);
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, bytes);
    }
    browser = await chromium.launchPersistentContext(path.join(folder, 'profile'), {
      channel: 'chromium', headless: true,
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    await browser.route(/^https?:\/\//, (route) => route.abort());
    const worker = browser.serviceWorkers()[0] ?? await browser.waitForEvent('serviceworker');
    const atlas = await browser.newPage();
    await browser.route('https://play.atlas-vtt.dev/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Test table</title>' }));
    await atlas.goto('https://play.atlas-vtt.dev/');
    await atlas.evaluate(() => {
      window.testRolls = [];
      window.testAvailable = true;
      window.addEventListener('message', (event) => {
        if (event.source !== window || event.origin !== location.origin || event.data?.channel !== 'atlas-sheet-rolls/v1') return;
        if (!['probe', 'roll'].includes(event.data.kind)) return;
        if (event.data.kind === 'roll') window.testRolls.push(event.data.roll);
        window.postMessage({ channel: event.data.channel, kind: 'reply', id: event.data.id, reply: { ok: true, available: window.testAvailable } }, location.origin);
      });
    });
    const sheet = await browser.newPage();
    await sheet.route('https://www.dndbeyond.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><h1 class="ddbc-character-name">Mira</h1><div class="ct-skills__item"><span class="ct-skills__col--skill">Stealth</span><button class="integrated-dice__container">+7</button></div>' }));
    await sheet.goto('https://www.dndbeyond.com/characters/test');
    await sheet.evaluate(() => document.addEventListener('click', () => { document.body.dataset.nativeRoll = 'yes'; }));
    await sheet.locator('button').click();
    await atlas.waitForFunction(() => window.testRolls.length === 1);
    assert.deepEqual(await atlas.evaluate(() => window.testRolls[0]), { site: 'dndbeyond', character: 'Mira', name: 'Stealth — Check', formula: '+7' });
    assert.equal(await sheet.locator('body').getAttribute('data-native-roll'), null);
    await sheet.locator('button').click({ modifiers: ['Alt'] });
    assert.equal(await sheet.locator('body').getAttribute('data-native-roll'), 'yes');
    assert.equal(await atlas.evaluate(() => window.testRolls.length), 1);

    const demi = await browser.newPage();
    await demi.route('https://app.demiplane.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html><h1 class="character-name">Mira</h1><button class="dice-roll-button">Roll</button>' }));
    await demi.goto('https://app.demiplane.com/nexus/daggerheart/character-sheet/test');
    await demi.evaluate(() => {
      let fiber = { memoizedProps: {
        events: { roll: { includePool: true, modifierOptions: [{ store: 'static', index: 0, purpose: 'add' }] } },
        systemDiceState: { value: { currentState: {
          dice: [{ slug: 'hope', die: 'd12' }, { slug: 'fear', die: 'd12' }, { slug: 'advantage', die: 'd6' }],
          pool: [{ dice: [{ slug: 'hope' }, { slug: 'fear' }, { slug: 'advantage' }] }],
          modifiers: { static: [{ value: 2 }], rollName: [{ value: 'Duality Roll' }, { value: '' }] },
        } } },
      }, return: null };
      for (let i = 0; i < 8; i++) fiber = { memoizedProps: {}, return: fiber };
      Object.assign(document.querySelector('button'), { '__reactFiber$test': fiber });
    });
    await demi.locator('button').click();
    await atlas.waitForFunction(() => window.testRolls.length === 2);
    assert.deepEqual(await atlas.evaluate(() => window.testRolls[1]), { site: 'demiplane', character: 'Mira', name: 'Duality Roll', formula: 'd12+d12+d6+2', setAppearance: true });

    const second = await browser.newPage();
    await second.goto('https://play.atlas-vtt.dev/second');
    await sheet.locator('button').click();
    await sheet.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('choose your player table'));
    assert.equal(await atlas.evaluate(() => window.testRolls.length), 2);
    await second.close();

    await atlas.evaluate(() => { window.testAvailable = false; });
    await sheet.locator('button').click();
    await sheet.waitForFunction(() => document.querySelector('[role="status"]')?.textContent?.includes('connected GM'));
    assert.equal(await atlas.evaluate(() => window.testRolls.length), 2);

    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${new URL(worker.url()).hostname}/popup.html`);
    assert.equal(await popup.title(), 'Atlas Dice');
    assert.equal(await popup.locator('.version').textContent(), version);
  } finally {
    await browser?.close();
    await rm(folder, { recursive: true, force: true });
  }
});
