import { test, expect } from '@playwright/test';
import { calculateReport, MODEL_ID } from '../../shared/calibration';
import { exampleMetadata, examplePoints } from '../../src/lib/sample';

const fixtureAnalysis = {
  model: MODEL_ID,
  generatedAt: '2026-10-18T17:00:00Z',
  calculation: calculateReport({ metadata: exampleMetadata, points: examplePoints }),
  narrative: {
    summary: 'Synthetic information: the technician must check the record before sharing.',
    observations: [{ pointIds: ['P00'], text: 'Source reading is outside supplied tolerance as found.' }],
    reviewItems: [{ pointIds: ['P25'], action: 'Verify traceability of the reference instrument.' }],
  },
};

async function loadSample(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /precision is measured/i })).toBeVisible();
  await page.getByRole('button', { name: /try sample workflow/i }).click();
  await expect(page).toHaveURL(/\/app\/verify$/);
  await expect(page.getByText('synthetic-demonstration.csv')).toBeVisible();
}

test('home, route guards, sample workflow, history and responsive navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /precision is measured/i })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: /launch workspace/i })).toHaveAttribute('href', '/app/capture');
  await expect(page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: /methodology/i })).toHaveAttribute('href', '/methodology');
  await expect(page.getByRole('link', { name: /source code/i })).toHaveAttribute('href', /github\.com\/ometere123\/Calivryn/);

  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: /methodology/i }).click();
  await expect(page).toHaveURL(/\/methodology$/);
  await expect(page.getByRole('heading', { name: /deterministic measurement method/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /architecture/i })).toHaveAttribute('href', /docs\/ARCHITECTURE\.md/);

  await page.getByRole('navigation', { name: 'Public navigation' }).getByRole('link', { name: /launch workspace/i }).click();
  await expect(page).toHaveURL(/\/app\/capture$/);
  await page.getByRole('button', { name: /load complete sample dataset/i }).click();
  await expect(page).toHaveURL(/\/app\/verify$/);
  await expect(page.getByText('1/5')).toBeVisible();
  await expect(page.getByText('5/5')).toBeVisible();
  await expect(page.getByText('P00')).toBeVisible();

  await page.getByRole('link', { name: /^Capture/ }).click();
  await page.getByLabel('Client / company').fill('Edited Instrument Services');
  await expect(page.getByLabel('Client / company')).toHaveValue(/Edited Instrument Services/);
  await page.getByRole('button', { name: /continue to verify/i }).click();
  await page.getByRole('link', { name: /Analyse/ }).click();
  await expect(page).toHaveURL(/\/app\/analyse$/);
  await expect(page.getByText(MODEL_ID)).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/app\/verify$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/app\/analyse$/);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /open workspace navigation/i }).click();
  await expect(page.locator('.mobile-nav-panel')).toBeVisible();
  await page.getByRole('link', { name: /^Verify/ }).last().click();
  await expect(page).toHaveURL(/\/app\/verify$/);
  await page.reload();
  await expect(page).toHaveURL(/\/app\/capture$/);
  await expect(page.getByRole('status')).toContainText(/in-memory session/i);
});

test('provider failures and malformed browser responses never create fabricated review output', async ({ page }) => {
  await page.goto('/app/review');
  await expect(page).toHaveURL(/\/app\/capture$/);
  await expect(page.getByRole('status')).toContainText(/no source readings/i);
  await loadSample(page);
  await page.getByRole('link', { name: /Analyse/ }).click();

  await page.route('**/api/analyze', route => route.fulfill({
    status: 503,
    contentType: 'application/json',
    body: JSON.stringify({ error: { code: 'AI_PROVIDER_UNAVAILABLE', message: 'Model unavailable' } }),
  }));
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  await expect(page.getByRole('alert')).toContainText('Model unavailable');
  await expect(page.getByRole('heading', { name: /intelligence meets accountability/i })).toHaveCount(0);
  await page.unroute('**/api/analyze');

  await page.route('**/api/analyze', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ...fixtureAnalysis, narrative: { ...fixtureAnalysis.narrative, observations: [{ pointIds: ['P999'], text: 'Ungrounded.' }] } }),
  }));
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  await expect(page.getByRole('alert')).toContainText(/malformed or ungrounded/i);
  await expect(page.getByRole('heading', { name: /intelligence meets accountability/i })).toHaveCount(0);
  await page.unroute('**/api/analyze');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/app/export');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/app\/analyse$/);
  await expect(page.getByRole('status')).toContainText(/generate and validate/i);
});

test('mocked schema-valid analysis supports review, PDF export, new reports and source invalidation', async ({ page }) => {
  await loadSample(page);
  await page.getByRole('link', { name: /Analyse/ }).click();
  await page.route('**/api/analyze', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixtureAnalysis) }));
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  await expect(page).toHaveURL(/\/app\/review$/);
  await expect(page.getByRole('heading', { name: /intelligence meets accountability/i })).toBeVisible();
  await page.getByRole('textbox', { name: /executive summary/i }).fill('Edited technician-approved summary.');
  await expect(page.getByRole('button', { name: /prepare final report/i })).toBeDisabled();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /prepare final report/i }).click();
  await expect(page).toHaveURL(/\/app\/export$/);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /download pdf report/i }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^calivryn-PT-204-DEMO-2026-10-18\.pdf$/);
  await expect(page.getByRole('status')).toContainText(/report generated/i);

  await page.getByRole('button', { name: /start a new report/i }).click();
  await expect(page).toHaveURL(/\/app\/capture$/);
  await expect(page.getByText('No source readings loaded yet')).toBeVisible();

  await page.getByRole('button', { name: /load complete sample dataset/i }).click();
  await page.getByRole('link', { name: /Analyse/ }).click();
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  await page.getByRole('link', { name: /Verify/ }).click();
  await page.getByLabel('Reading 1 As-found').fill('0.12');
  await page.evaluate(() => {
    window.history.pushState({}, '', '/app/review');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveURL(/\/app\/analyse$/);
  await expect(page.getByRole('status')).toContainText(/generate and validate/i);
});
