import { cp, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = `${root}node_modules/@vladmandic/human/models`;
try {
  await access(source);
  await mkdir(`${root}public/models`, { recursive: true });
  await cp(source, `${root}public/models`, { recursive: true });
  console.log('Face recognition models ready.');
} catch (error) {
  console.error('Could not prepare recognition models:', error.message);
  process.exitCode = 1;
}
