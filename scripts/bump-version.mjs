#!/usr/bin/env node
/**
 * Bump package.json patch version (and package-lock.json) without git tags.
 * Usage:
 *   node scripts/bump-version.mjs          # patch +1
 *   node scripts/bump-version.mjs patch
 *   node scripts/bump-version.mjs minor
 *   node scripts/bump-version.mjs major
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const level = (process.argv[2] || 'patch').toLowerCase();
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error(`Invalid level "${level}". Use: patch | minor | major`);
  process.exit(1);
}

function parseSemver(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error(`Unsupported version "${v}" (need X.Y.Z)`);
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function bump({ major, minor, patch }, kind) {
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const prev = pkg.version;
const next = bump(parseSemver(prev), level);
pkg.version = next;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const lockPath = join(root, 'package-lock.json');
if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  lock.version = next;
  if (lock.packages?.['']) {
    lock.packages[''].version = next;
  }
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

// Keep README version badges in sync when present.
for (const name of ['README.md', 'README.zh-CN.md']) {
  const p = join(root, name);
  if (!existsSync(p)) continue;
  const text = readFileSync(p, 'utf8');
  const updated = text
    .replace(/\*\*v\d+\.\d+\.\d+\*\*/g, `**v${next}**`)
    .replace(/\| \*\*v\d+\.\d+\.\d+\*\* \|/g, `| **v${next}** |`);
  if (updated !== text) writeFileSync(p, updated);
}

console.log(`version: ${prev} → ${next}`);
