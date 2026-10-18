import assert from 'node:assert/strict';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = `${root}dist`;
const { version } = JSON.parse(await readFile(`${root}package.json`, 'utf8'));
const manifest = JSON.parse(await readFile(`${root}public/manifest.json`, 'utf8'));
assert.equal(manifest.version, version, 'package.json and manifest.json must name the same version');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(`${root}public`, output, { recursive: true });
await cp(`${root}docs`, `${output}/docs`, { recursive: true });
for (const file of ['LICENSE', 'README.md', 'PRIVACY.md']) await cp(`${root}${file}`, `${output}/${file}`);
for (const entry of ['background', 'atlasContent', 'sheetContent', 'demiplanePage', 'popup']) {
  await build({
    configFile: false, root, publicDir: false,
    build: {
      outDir: output, emptyOutDir: false, target: 'chrome120',
      lib: { entry: `${root}src/${entry}.ts`, name: 'AtlasDice', formats: ['iife'], fileName: () => `${entry}.js` },
    },
  });
}
console.log(`Load unpacked: ${output}`);
