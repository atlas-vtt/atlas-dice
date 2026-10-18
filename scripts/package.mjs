import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const directory = path.join(root, 'dist');
const files = {};
for (const file of await readdir(directory, { recursive: true, withFileTypes: true })) {
  if (!file.isFile()) continue;
  const full = path.join(file.parentPath, file.name);
  files[path.relative(directory, full).split(path.sep).join('/')] = new Uint8Array(await readFile(full));
}
await mkdir(path.join(root, 'release'), { recursive: true });
const output = path.join(root, 'release', `atlas-dice-${version}.zip`);
await writeFile(output, zipSync(files, { level: 9 }));
console.log(`Install ZIP: ${output}`);
