/**
 * Capture README screenshots with Chromium + unpacked MV3 extension.
 * Usage: node scripts/capture-readme-shots.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extPath = join(root, '.output', 'chrome-mv3');
const outDir = join(root, 'docs', 'screenshots');

if (!existsSync(join(extPath, 'manifest.json'))) {
  console.error('Missing build at .output/chrome-mv3 — run npm run build first');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const userDataDir = join(root, '.tmp', 'readme-shots-profile');
mkdirSync(userDataDir, { recursive: true });

const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${extPath}`,
    `--load-extension=${extPath}`,
    '--no-first-run',
    '--no-default-browser-check',
  ],
  viewport: { width: 1280, height: 800 },
});

// Wait for extension service worker / background
let extId = '';
for (let i = 0; i < 40; i++) {
  const sw = context.serviceWorkers();
  const bg = sw.find((w) => w.url().startsWith('chrome-extension://'));
  if (bg) {
    extId = new URL(bg.url()).hostname;
    break;
  }
  const pages = context.backgroundPages?.() || [];
  // MV3: poll workers
  await new Promise((r) => setTimeout(r, 250));
  for (const w of context.serviceWorkers()) {
    if (w.url().startsWith('chrome-extension://')) {
      extId = new URL(w.url()).hostname;
      break;
    }
  }
  if (extId) break;
}

if (!extId) {
  // Fallback: open any extension page from targets
  const page = await context.newPage();
  await page.goto('chrome://extensions');
  await page.waitForTimeout(1000);
  // Last resort: parse from serviceWorkers again
  for (const w of context.serviceWorkers()) {
    if (w.url().startsWith('chrome-extension://')) {
      extId = new URL(w.url()).hostname;
      break;
    }
  }
  await page.close();
}

if (!extId) {
  console.error('Could not resolve extension id');
  await context.close();
  process.exit(1);
}

console.log('extension id:', extId);

const demoHtml = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>Demo — OmniPilot Web Guide</title>
  <style>
    body { font-family: "Segoe UI", "PingFang SC", sans-serif; margin: 0; background: #f4f6f2; color: #1a1f16; }
    header { padding: 28px 40px; background: linear-gradient(135deg, #1f3d2b, #3d6b4f); color: #f5faf6; }
    header h1 { margin: 0 0 8px; font-size: 1.6rem; }
    header p { margin: 0; opacity: .9; }
    main { padding: 32px 40px; max-width: 720px; }
    .card { background: #fff; border: 1px solid #d5ddd0; border-radius: 14px; padding: 20px; margin-bottom: 16px; }
    button, input { font: inherit; }
    .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    button.primary { background: #1f3d2b; color: #fff; border: 0; border-radius: 999px; padding: 10px 18px; }
    button.ghost { background: #fff; border: 1px solid #c5cebc; border-radius: 999px; padding: 10px 18px; }
    input { border: 1px solid #c5cebc; border-radius: 10px; padding: 10px 12px; min-width: 220px; }
    video { width: 100%; max-width: 480px; background: #111; border-radius: 10px; }
  </style>
</head>
<body>
  <header>
    <h1>演示站点</h1>
    <p>用于展示 OmniPilot Web Guide 的分析与引导能力</p>
  </header>
  <main>
    <div class="card">
      <h2>媒体控件</h2>
      <video controls poster="" width="480" height="270"></video>
      <div class="row">
        <button class="primary" type="button" aria-label="播放">播放</button>
        <button class="ghost" type="button" aria-label="暂停">暂停</button>
        <button class="ghost" type="button">跳到 20:00</button>
      </div>
    </div>
    <div class="card">
      <h2>表单</h2>
      <div class="row">
        <input aria-label="邮箱" placeholder="you@example.com" />
        <button class="primary" type="button" id="save">保存</button>
      </div>
    </div>
  </main>
</body>
</html>`;

// 1) Float-like sidepanel UI
const panel = await context.newPage();
await panel.setViewportSize({ width: 420, height: 720 });
await panel.goto(`chrome-extension://${extId}/sidepanel.html?float=1`, {
  waitUntil: 'domcontentloaded',
});
await panel.waitForTimeout(800);
await panel.screenshot({
  path: join(outDir, '01-float-panel.png'),
  type: 'png',
});

// Switch to Ask tab if present
const askTab = panel.locator('button.opg-tab', { hasText: /问一问|Ask/i }).first();
if (await askTab.count()) {
  await askTab.click();
  await panel.waitForTimeout(400);
  await panel.screenshot({
    path: join(outDir, '02-ask-tab.png'),
    type: 'png',
  });
}

// Open settings inside panel
const settingsBtn = panel.locator('[data-role="settings"]').first();
if (await settingsBtn.count()) {
  await settingsBtn.click();
  await panel.waitForTimeout(500);
  await panel.screenshot({
    path: join(outDir, '03-settings.png'),
    type: 'png',
  });
}

// 2) Demo host page (context for README hero composition)
const demo = await context.newPage();
await demo.setViewportSize({ width: 1100, height: 700 });
await demo.setContent(demoHtml, { waitUntil: 'domcontentloaded' });
await demo.waitForTimeout(300);
await demo.screenshot({
  path: join(outDir, '04-demo-page.png'),
  type: 'png',
});

// 3) Options page
const options = await context.newPage();
await options.setViewportSize({ width: 720, height: 900 });
await options.goto(`chrome-extension://${extId}/options.html`, {
  waitUntil: 'domcontentloaded',
});
await options.waitForTimeout(600);
await options.screenshot({
  path: join(outDir, '05-options.png'),
  type: 'png',
});

console.log('screenshots written to', outDir);
await context.close();
