#!/usr/bin/env node
/**
 * One-click deploy router for browser-extension packaging.
 * Usage: node deploy/deploy.mjs [binary|docker|k8s] [--dry-run] [--build-only]
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MODE = (process.argv[2] || 'binary').toLowerCase()
const FLAGS = new Set(process.argv.slice(3))
const DRY = FLAGS.has('--dry-run')
const BUILD_ONLY = FLAGS.has('--build-only')
const ENV = process.env.ENV || 'staging'

const started = Date.now()

function fail(msg, code = 1) {
  console.error(`ERROR: ${msg}`)
  process.exit(code)
}

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`)
  if (DRY) return { status: 0 }
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })
  if (r.status !== 0) fail(`${cmd} exited ${r.status}`)
  return r
}

function summary(extra = {}) {
  const secs = ((Date.now() - started) / 1000).toFixed(1)
  console.log('\n=== Deploy Result ===')
  console.log(`mode: ${MODE}`)
  console.log(`env: ${ENV}`)
  console.log(`dry_run: ${DRY}`)
  console.log(`duration_s: ${secs}`)
  for (const [k, v] of Object.entries(extra)) console.log(`${k}: ${v}`)
}

if (!['binary', 'docker', 'k8s'].includes(MODE)) {
  fail(`unknown mode "${MODE}" (use binary|docker|k8s)`)
}

if (MODE === 'docker' || MODE === 'k8s') {
  console.log(`[${MODE}] Browser extension — no container/${MODE === 'k8s' ? 'cluster' : 'compose'} deploy.`)
  console.log('Use: node deploy/deploy.mjs binary   (or: make deploy-binary)')
  if (DRY || BUILD_ONLY) {
    summary({
      access: 'N/A — load unpacked from .output/chrome-mv3 or install store zip',
      note: `${MODE} mode is a documented stub for OmniDev three-mode coverage`,
    })
    process.exit(0)
  }
  fail(`${MODE} deploy is not applicable; use binary mode`, 2)
}

// --- binary: CI + pack extension zips ---
console.log('[binary] Extension pack (Chrome + Firefox zips)')
if (!existsSync(path.join(ROOT, 'package.json'))) fail('package.json missing')

if (BUILD_ONLY) {
  run('npm', ['run', 'build'])
  run('npm', ['run', 'build:firefox'])
} else if (DRY) {
  console.log('> npm run ci')
  console.log('> npm run pack')
} else {
  run('npm', ['run', 'ci'])
  run('npm', ['run', 'pack'])
}

const chromeOut = path.join(ROOT, '.output', 'chrome-mv3')
const zipHint = path.join(ROOT, '.output')
summary({
  chrome_unpacked: existsSync(chromeOut) || DRY ? chromeOut : '(build first)',
  artifacts_dir: zipHint,
  access: 'chrome://extensions → Load unpacked → .output/chrome-mv3',
  store_zips: DRY ? '(after pack)' : 'wxt zip outputs under .output/',
})
