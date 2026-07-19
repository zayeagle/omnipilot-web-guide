import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Scaffold smoke — full extension load needs Chromium --load-extension (Phase 4 expand).
 */
test('TC-E2E-01: built extension manifest exposes side panel', async () => {
  const manifestPath = join(process.cwd(), '.output/chrome-mv3/manifest.json');
  expect(existsSync(manifestPath)).toBe(true);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    side_panel?: { default_path?: string };
    name?: string;
  };
  expect(manifest.side_panel?.default_path).toBeTruthy();
});

test('TC-E2E-02: fixture page has interactive controls', async ({ page }) => {
  await page.setContent(`
    <html><body>
      <h1>Demo</h1>
      <button id="save">Save</button>
      <input aria-label="Email" />
    </body></html>
  `);
  await expect(page.locator('#save')).toHaveText('Save');
  await expect(page.getByLabel('Email')).toBeVisible();
});
