import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.CALIVRYN_BASE_URL || 'http://127.0.0.1:8877';
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
try {
  for (const [name, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['tablet', { width: 1024, height: 900 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `docs/screenshots/home-${name}.png`, fullPage: true });
    await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: /launch workspace/i }).click();
    await page.waitForURL(/\/app\/capture$/);
    await page.screenshot({ path: `docs/screenshots/capture-${name}.png`, fullPage: true });
    await page.getByRole('button', { name: /load complete sample dataset/i }).click();
    await page.screenshot({ path: `docs/screenshots/verify-${name}.png`, fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}
