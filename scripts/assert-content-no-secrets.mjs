/**
 * Fail CI if content-script bundles look like they embed API keys / vault material.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.cwd(), '.output');
if (!existsSync(out)) {
  console.log('assert:content skip — no .output yet');
  process.exit(0);
}

const patterns = [
  /sk-[a-zA-Z0-9]{20,}/,
  /api[_-]?key["']?\s*[:=]\s*["'][^"']{8,}/i,
  /cipherB64/,
  /passphrase["']?\s*[:=]\s*["'][^"']+/i,
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, files);
    else if (/\.(js|mjs|css)$/.test(name.name)) files.push(p);
  }
  return files;
}

const contentFiles = walk(out).filter((f) => /content/i.test(f));
let bad = 0;
for (const f of contentFiles) {
  const text = readFileSync(f, 'utf8');
  for (const re of patterns) {
    if (re.test(text)) {
      console.error(`Secret-like pattern in ${f}: ${re}`);
      bad++;
    }
  }
}

if (bad) process.exit(1);
console.log(`assert:content ok (${contentFiles.length} content-related files)`);
