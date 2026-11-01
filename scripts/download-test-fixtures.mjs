import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const dir = fileURLToPath(new URL('../test-results/fixtures/', import.meta.url));
await mkdir(dir, { recursive: true });
const fixtures = [['reference.jpg', 'obama.jpg'], ['different-angle.jpg', 'obama2.jpg'], ['other-person.jpg', 'biden.jpg']];
for (const [local, remote] of fixtures) {
  const res = await fetch(`https://raw.githubusercontent.com/ageitgey/face_recognition/master/examples/${remote}`, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await writeFile(`${dir}${local}`, Buffer.from(await res.arrayBuffer()));
  console.log(`${local}: ready`);
}
