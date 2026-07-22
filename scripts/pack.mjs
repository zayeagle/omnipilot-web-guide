#!/usr/bin/env node
/**
 * One-click pack for Windows / Linux / macOS.
 * Usage:
 *   npm run pack:all
 *   node scripts/pack.mjs
 *   node scripts/pack.mjs --skip-test
 *   node scripts/pack.mjs --no-bump
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { platform } from 'node:os';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skipTest = process.argv.includes('--skip-test');
const noBump = process.argv.includes('--no-bump');
const npmCmd = 'npm';

function run(cmd, args, label) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    // Windows: shell so `npm` resolves; avoid process.execPath (spaces break).
    shell: platform() === 'win32',
  });
  if (r.error) {
    console.error(`\n✖ Failed: ${label} (${r.error.message})`);
    process.exit(1);
  }
  if (r.status !== 0) {
    console.error(`\n✖ Failed: ${label} (exit ${r.status ?? 'unknown'})`);
    process.exit(r.status ?? 1);
  }
}

function pkgVersion() {
  return JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
}

console.log('OmniPilot Web Guide · one-click pack');
console.log(`Platform: ${platform()} | Node: ${process.version}`);
console.log(`Root: ${root}`);

if (!existsSync(join(root, 'package.json'))) {
  console.error('package.json not found — run from repo root');
  process.exit(1);
}

if (!existsSync(join(root, 'node_modules'))) {
  run(npmCmd, ['install'], 'npm install');
}

run(npmCmd, ['run', 'icons'], 'generate icons');

if (!skipTest) {
  run(npmCmd, ['test'], 'unit tests');
} else {
  console.log('\n⏭ skip tests (--skip-test)');
}

if (!noBump) {
  run(npmCmd, ['run', 'bump'], 'bump patch version');
} else {
  console.log(`\n⏭ skip bump (--no-bump) · current ${pkgVersion()}`);
}

console.log(`\n📦 packing version ${pkgVersion()}`);

run(npmCmd, ['run', 'zip'], 'zip Chrome');
run(npmCmd, ['run', 'assert:content'], 'assert content bundle has no secrets');
run(npmCmd, ['run', 'zip:firefox'], 'zip Firefox');

const out = join(root, '.output');
const zips = existsSync(out)
  ? readdirSync(out).filter((f) => f.endsWith('.zip'))
  : [];

console.log(`\n✔ Pack complete (v${pkgVersion()}). Installable artifacts:`);
for (const z of zips) {
  console.log(`  · .output/${z}`);
}
console.log('\nInstall like a normal extension:');
console.log(
  '  Chrome/Edge: chrome://extensions → Developer mode → Load unpacked (.output/chrome-mv3) or drag zip',
);
console.log(
  '  Firefox: about:debugging → This Firefox → Load Temporary Add-on (.output/firefox-mv2)',
);
console.log(`\nTips:`);
console.log(`  npm run pack:all -- --skip-test   # faster rebuild (still bumps)`);
console.log(`  npm run pack:all -- --no-bump     # rebuild without version bump`);
console.log(`  npm run bump                      # bump only`);
