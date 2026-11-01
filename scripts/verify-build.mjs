import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(match => match[1]);
if (!assets.length) throw new Error('Production entry assets were not found.');
for (const asset of assets) await stat(resolve(dist, `.${asset}`));
let totalBytes = 0;
for (const name of ['blazeface', 'facemesh', 'faceres']) {
  const path = resolve(dist, 'models', `${name}.json`);
  const model = JSON.parse(await readFile(path, 'utf8'));
  const shards = model.weightsManifest?.flatMap(group => group.paths) || [];
  if (!shards.length) throw new Error(`Weight files missing in ${name}.json.`);
  for (const shard of shards) {
    const info = await stat(resolve(dirname(path), shard));
    if (!info.size) throw new Error(`Empty recognition weight file: ${shard}`);
    totalBytes += info.size;
  }
}
console.log(`Static build verified: entry assets and recognition weights (${(totalBytes / 1024 / 1024).toFixed(1)} MB).`);
