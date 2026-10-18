import { mkdir, copyFile, stat, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.CALIVRYN_URL || 'https://calivryn.delealufejoel.workers.dev';
const expectedModel = '@cf/google/gemma-4-26b-a4b-it';
const evidenceDir = 'docs/evidence';
const screenshotDir = 'docs/screenshots';
const payload = {
  metadata: {
    client: 'Harbour Industrial Services (fictional)',
    project: 'Pressure transmitter service — synthetic demonstration',
    instrumentId: 'PT-204-DEMO',
    instrumentType: 'Pressure transmitter',
    technician: 'Demo technician',
    date: '2026-10-18',
    unit: 'bar',
    notes: 'Synthetic training dataset only. No actual instrument was used.',
  },
  points: [
    { point_id: 'P00', reference: '0', as_found: '0.11', as_left: '0.01', tolerance: '0.05' },
    { point_id: 'P25', reference: '2.5', as_found: '2.59', as_left: '2.52', tolerance: '0.05' },
    { point_id: 'P50', reference: '5', as_found: '5.06', as_left: '5.01', tolerance: '0.05' },
    { point_id: 'P75', reference: '7.5', as_found: '7.52', as_left: '7.50', tolerance: '0.05' },
    { point_id: 'P100', reference: '10', as_found: '9.92', as_left: '9.98', tolerance: '0.05' },
  ],
};

async function jsonFetch(path, init = {}) {
  const response = await fetch(`${baseURL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  let body;
  try { body = await response.json(); } catch { body = { unreadable: true }; }
  return { status: response.status, body };
}

await mkdir(evidenceDir, { recursive: true });
await mkdir(screenshotDir, { recursive: true });

const health = await jsonFetch('/api/health', { headers: {} });
const forbiddenOrigin = await jsonFetch('/api/analyze', {
  method: 'POST', headers: { Origin: 'https://hostile.example' }, body: JSON.stringify(payload),
});
const invalidContentTypeResponse = await fetch(`${baseURL}/api/analyze`, {
  method: 'POST', headers: { 'Content-Type': 'application/jsonp' }, body: JSON.stringify(payload),
});

const routeChecks = [];
for (const path of ['/', '/app/capture', '/app/verify', '/app/analyse', '/app/review', '/app/export', '/methodology']) {
  const response = await fetch(`${baseURL}${path}`, { redirect: 'manual' });
  routeChecks.push({ path, status: response.status, contentType: response.headers.get('content-type') });
}

const browser = await chromium.launch();
let analysis;
let downloadedReport;
const screenshotEvidence = [];
const capture = async (page, name) => {
  const path = `${screenshotDir}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  screenshotEvidence.push(path);
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${baseURL}/`, { waitUntil: 'networkidle' });
  await capture(page, 'home-desktop');
  await page.getByRole('button', { name: /try sample workflow/i }).click();
  await page.waitForURL(/\/app\/verify$/);
  await capture(page, 'verify-desktop');
  await page.getByRole('link', { name: /^Capture/ }).click();
  await page.waitForURL(/\/app\/capture$/);
  await capture(page, 'capture-desktop');
  await page.getByRole('link', { name: /Analyse/ }).click();
  await page.waitForURL(/\/app\/analyse$/);
  await capture(page, 'analyse-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'analyse-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });

  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/analyze'));
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  const apiResponse = await responsePromise;
  analysis = await apiResponse.json();
  if (apiResponse.status() !== 200 || analysis?.model !== expectedModel) {
    throw new Error(`Live analysis did not return the expected model (${apiResponse.status()}, ${analysis?.model || 'missing'})`);
  }
  await page.waitForURL(/\/app\/review$/);
  await capture(page, 'review-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'review-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('textbox', { name: /executive summary/i }).fill('Reviewed during the public synthetic smoke test.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /prepare final report/i }).click();
  await page.waitForURL(/\/app\/export$/);
  await capture(page, 'export-desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, 'export-mobile');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /download pdf report/i }).click();
  const download = await downloadPromise;
  const tempPath = await download.path();
  if (!tempPath) throw new Error('Browser did not expose the downloaded PDF path');
  downloadedReport = { filename: download.suggestedFilename(), bytes: (await stat(tempPath)).size };
  await copyFile(tempPath, `${evidenceDir}/live-smoke-report.pdf`);
} finally {
  await browser.close();
}

const quotaStatuses = [];
for (let index = 0; index < 4; index += 1) {
  const result = await jsonFetch('/api/analyze', {
    method: 'POST', headers: { Origin: baseURL }, body: JSON.stringify(payload),
  });
  quotaStatuses.push({ status: result.status, code: result.body?.error?.code || 'SUCCESS' });
}

await writeFile(`${evidenceDir}/live-smoke.json`, `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  baseURL,
  routeChecks,
  health,
  analysis: {
    status: analysis?.model ? 200 : 'unknown',
    model: analysis?.model,
    generatedAt: analysis?.generatedAt,
    calculation: analysis?.calculation,
    narrative: analysis?.narrative,
  },
  browserExport: downloadedReport,
  screenshots: screenshotEvidence,
  protectedFailures: {
    hostileOrigin: forbiddenOrigin,
    invalidContentType: { status: invalidContentTypeResponse.status },
    quotaSequence: quotaStatuses,
    providerFailure: 'Covered by the Worker regression test with a throwing AI binding; no live provider outage was induced.',
  },
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ baseURL, model: analysis?.model, browserExport: downloadedReport, routeChecks, quotaStatuses }, null, 2));
