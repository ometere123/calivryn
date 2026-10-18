import { test, expect } from '@playwright/test';

test('synthetic dataset imports and deterministic computation is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /precision is measured/i })).toBeVisible();
  await page.getByRole('button', { name: /load complete sample dataset/i }).click();
  await expect(page.getByRole('heading', { name: /every number earns its place/i })).toBeVisible();
  await expect(page.getByText('synthetic-demonstration.csv')).toBeVisible();
  await expect(page.getByRole('button', { name: /continue to ai analysis/i })).toBeEnabled();
  await page.getByRole('button', { name: /continue to ai analysis/i }).click();
  await expect(page.getByRole('heading', { name: /interpretation without invention/i })).toBeVisible();
  await expect(page.getByText(/real model execution/i)).toBeVisible();
});

test('never creates placeholder AI output if model is unavailable', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /load complete sample dataset/i }).click();
  await page.getByRole('button', { name: /continue to ai analysis/i }).click();
  await page.route('**/api/analyze', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'AI_PROVIDER_UNAVAILABLE', message: 'Model unavailable' } }) }));
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  await expect(page.getByRole('alert')).toContainText('Model unavailable');
  await expect(page.getByRole('heading', { name: /intelligence meets accountability/i })).toHaveCount(0);
});

test('simulated inference exercises human review and browser PDF without claiming live AI proof', async ({ page }) => {
  // Browser interaction test only. Live-inference verification must use the real Cloudflare binding.
  const { calculateReport, MODEL_ID } = await import('../../shared/calibration');
  const { exampleMetadata, examplePoints } = await import('../../src/lib/sample');
  await page.goto('/');
  await page.getByRole('button', { name: /load complete sample dataset/i }).click();
  await page.getByRole('button', { name: /continue to ai analysis/i }).click();
  await page.route('**/api/analyze', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({
      model: MODEL_ID, generatedAt: '2026-10-18T17:00:00Z', calculation: calculateReport({ metadata: exampleMetadata, points: examplePoints }),
      narrative: { summary: 'Synthetic information: the technician must check the record before sharing.', observations: [
        { pointIds: ['P00'], text: 'Source reading is outside supplied tolerance as found.' },
      ], reviewItems: [{ pointIds: ['P25'], action: 'Verify traceability of the reference instrument.' }] },
    }),
  }));
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  await expect(page.getByRole('heading', { name: /intelligence meets accountability/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /prepare final report/i })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /prepare final report/i }).click();
  await expect(page.getByRole('heading', { name: /evidence, ready to deliver/i })).toBeVisible();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /download pdf report/i }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^calivryn-PT-204-DEMO-2026-10-18\.pdf$/);
});
