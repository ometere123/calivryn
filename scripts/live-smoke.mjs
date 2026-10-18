import { mkdir, copyFile, stat, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseURL = process.env.CALIVRYN_URL || 'https://calivryn.delealufejoel.workers.dev';
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

const health = await jsonFetch('/api/health', { headers: {} });
const forbiddenOrigin = await jsonFetch('/api/analyze', {
  method: 'POST', headers: { Origin: 'https://hostile.example' }, body: JSON.stringify(payload),
});
const invalidContentTypeResponse = await fetch(`${baseURL}/api/analyze`, {
  method: 'POST', headers: { 'Content-Type': 'application/jsonp' }, body: JSON.stringify(payload),
});

const browser = await chromium.launch();
let analysis;
let downloadedReport;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /load complete sample dataset/i }).click();
  await page.getByRole('button', { name: /continue to ai analysis/i }).click();
  const responsePromise = page.waitForResponse(response => response.url().endsWith('/api/analyze'));
  await page.getByRole('button', { name: /generate evidence narrative/i }).click();
  const apiResponse = await responsePromise;
  analysis = await apiResponse.json();
  await page.getByRole('heading', { name: /intelligence meets accountability/i }).waitFor();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /prepare final report/i }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /download pdf report/i }).click();
  const download = await downloadPromise;
  const tempPath = await download.path();
  if (!tempPath) throw new Error('Browser did not expose the downloaded PDF path');
  await mkdir('docs/evidence', { recursive: true });
  downloadedReport = { filename: download.suggestedFilename(), bytes: (await stat(tempPath)).size };
  await copyFile(tempPath, 'docs/evidence/live-smoke-report.pdf');
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

await mkdir('docs/evidence', { recursive: true });
await writeFile('docs/evidence/live-smoke.json', `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  baseURL,
  health,
  analysis: {
    status: analysis?.model ? 200 : 'unknown',
    model: analysis?.model,
    generatedAt: analysis?.generatedAt,
    calculation: analysis?.calculation,
    narrative: analysis?.narrative,
  },
  browserExport: downloadedReport,
  protectedFailures: {
    hostileOrigin: forbiddenOrigin,
    invalidContentType: { status: invalidContentTypeResponse.status },
    quotaSequence: quotaStatuses,
    providerFailure: 'Covered by the Worker regression test with a throwing AI binding; no live provider outage was induced.',
  },
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ baseURL, model: analysis?.model, browserExport: downloadedReport, quotaStatuses }, null, 2));
