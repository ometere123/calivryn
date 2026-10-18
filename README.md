# Calivryn

**Precision is measured. Clarity is generated.**

[Live application](https://calivryn.delealufejoel.workers.dev) · [Source repository](https://github.com/ometere123/Calivryn) · [Live smoke evidence](docs/evidence/live-smoke.json)

Calivryn is an open-source, AI-assisted calibration service-report preparation tool for independent instrumentation and calibration technicians. It turns a CSV of reference readings into a deterministic, evidence-linked, technician-reviewed PDF report.

Calivryn is not an accredited calibration certificate generator, safety-to-operate authority, measurement-uncertainty calculator, or autonomous metrological approval system. A qualified technician remains responsible for the supplied tolerances, source records, interpretation, and final report.

## Why this exists

Small calibration and instrumentation teams often move from field readings to a client-facing service report by copying values between spreadsheets, calculating deviations manually, and writing a narrative from memory. That workflow is repetitive and makes it easy to lose a signed error, misread a tolerance boundary, or let prose outrun the evidence.

Calivryn keeps the high-integrity part deterministic: the browser and Worker independently calculate every error and tolerance result with `decimal.js`. Gemma is used only to turn the trusted calculation and untrusted technician notes into concise, point-referenced language. The technician edits and acknowledges the narrative before a PDF can be exported.

The target customer is an independent calibration technician, instrumentation contractor, or small service team. A believable pricing hypothesis is a low-cost pay-per-report or small monthly workspace plan priced below the time saved on report preparation; there are no paying customers or revenue claims in this repository.

## Product workflow

1. **Capture** — upload a real CSV, download a template, or load the clearly labelled synthetic demonstration dataset. Enter required job, instrument, unit, date, and technician-note metadata.
2. **Verify** — edit 1–40 points in a shared engineering unit and inspect exact signed errors, absolute errors, as-found/as-left tolerance status, and improvement/deterioration.
3. **Analyse** — send validated evidence and untrusted notes to the native Cloudflare `env.AI.run()` binding using `@cf/google/gemma-4-26b-a4b-it`.
4. **Review** — edit the summary, point-referenced observations, and review actions; explicitly acknowledge technician review.
5. **Export** — generate a multi-page PDF in the browser containing metadata, every reading, full-precision calculated results, grounded interpretation, notes, model provenance, acknowledgement, and limitations.

Changing source readings or relevant metadata invalidates previous analysis and approval. The Worker recalculates independently and refuses malformed, ungrounded, or provider-failure responses.

## Screenshots

These screenshots were captured from the real Vite application with the synthetic dataset; they are interface evidence, not customer records.

![Calivryn capture view on desktop](docs/screenshots/capture-desktop.png)

![Calivryn verification view on mobile](docs/screenshots/verify-mobile.png)

## Architecture and locked stack

```text
React + Vite + Tailwind browser UI
  ├─ PapaParse CSV input + Zod validation
  ├─ decimal.js deterministic preview
  ├─ same-origin POST /api/analyze
  │    └─ Cloudflare Worker
  │         ├─ request/origin/size checks
  │         ├─ Zod validation + independent decimal.js calculation
  │         ├─ Cloudflare rate-limit bindings
  │         └─ native env.AI.run(@cf/google/gemma-4-26b-a4b-it)
  └─ jsPDF browser export after human acknowledgement
```

The deployed Worker and Static Assets are one Cloudflare application using the official Cloudflare Vite plugin. There is no database, authentication, report history, persistent storage, external AI API, Vercel, Railway, Ollama, blockchain, payment flow, or paid infrastructure in this project.

Technology: TypeScript, React 19, Vite 7, Tailwind CSS 4, Cloudflare Workers/Static Assets, Workers AI, PapaParse, `decimal.js`, Zod, jsPDF, Vitest 5, Playwright, npm, Wrangler 4, and GitHub Actions.

See [the architecture notes](docs/ARCHITECTURE.md) and [security and metrological boundaries](docs/SECURITY.md).

## Deterministic calculation method

For each point:

```text
signed error      = measured reading - reference
absolute error    = |signed error|
within tolerance  = absolute error <= positive, technician-supplied tolerance
change            = improved | unchanged | deteriorated
overall result    = every point is within its own tolerance
```

The supported input grammar is finite, plain decimal text with up to 12 integer digits and 8 fractional digits. Scientific notation, `NaN`, `Infinity`, blank numbers, zero/negative tolerances, duplicate point IDs (including case variants), and unexpected object properties are rejected. Exact boundaries are compared with `decimal.js`; the AI does not select pass/fail or invent readings.

## CSV format

The header must contain exactly these five fields, in any order:

```csv
point_id,reference,as_found,as_left,tolerance
P00,0,0.11,0.01,0.05
P25,2.5,2.59,2.52,0.05
```

Limits: 1–40 rows, 30 KB maximum, unique point IDs, one shared engineering unit, positive absolute tolerances, and no implicit percentage or full-scale conversion. Units support common Unicode engineering notation such as `mΩ/°C·s⁻¹` and are printed in the PDF without numerical rounding.

## API contract

All API responses are JSON, `Cache-Control: no-store`, and served from the same Worker hostname.

### `GET /api/health`

Returns routing/configuration metadata, for example:

```json
{
  "ok": true,
  "model": "@cf/google/gemma-4-26b-a4b-it",
  "inference": "LIVE_BINDING_REQUIRED",
  "storage": false
}
```

This endpoint does not call the model and is not proof of inference compatibility.

### `POST /api/analyze`

Request body:

```json
{
  "metadata": {
    "client": "string",
    "project": "string",
    "instrumentId": "string",
    "instrumentType": "string",
    "technician": "string",
    "date": "YYYY-MM-DD",
    "unit": "bar",
    "notes": "untrusted technician context"
  },
  "points": [
    { "point_id": "P00", "reference": "0", "as_found": "0.11", "as_left": "0.01", "tolerance": "0.05" }
  ]
}
```

Success returns `model`, `generatedAt`, an authoritative `calculation`, and a validated `narrative` with `summary`, point-ID `observations`, and point-ID `reviewItems`. Errors are explicit: `400` malformed JSON/UTF-8, `403` unauthorized origin, `413` over 45 KB, `415` wrong content type, `422` invalid report, `429` rate limited, `502` malformed/ungrounded model output, and `503` unavailable provider or configuration.

The Worker never returns provider stack traces or confidential request data. It does not log report contents in application code. The coarse IP limiter and shared edge throttle are abuse controls, not a guaranteed account-wide daily spending cap; Cloudflare location-level behavior and provider quotas can vary.

## Privacy and safety

- Measurements, metadata, and notes stay in browser memory until analysis is requested.
- Analysis data is transmitted to Cloudflare Workers AI. Cloudflare/provider retention and logging policies remain applicable; Calivryn does not promise local-only processing or zero provider-side retention.
- No report database, account system, analytics, localStorage persistence, or report history is implemented.
- Technician notes are explicitly untrusted prompt data. The model has no tools, cannot change the calculation, and must cite existing point IDs. React escapes rendered text, strict schemas reject extra response properties, and the PDF exporter revalidates the narrative.
- The PDF is service-report preparation only. It does not establish traceability, uncertainty, accreditation, standards selection, compliance, or safe operation.
- Do not upload identifiable, confidential, or proprietary customer data without appropriate permission and a review of the provider terms.

See [docs/SECURITY.md](docs/SECURITY.md) for the threat model, adversarial cases, resource restrictions, and residual risk.

## Local development

Requirements: Node.js 22+ and npm.

```bash
npm ci
npm run dev
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm audit --omit=dev
npm audit
```

`npm run test` covers deterministic math, CSV parsing, Worker validation/model failure handling, and PDF safety. `npm run test:e2e` is a credential-free Playwright suite that intercepts the model response; it does not claim live inference. `npm run screenshots` captures the documented local interface at desktop and mobile viewports.

## Cloudflare deployment

The committed `wrangler.jsonc` uses the native AI binding, two simple rate-limit bindings, Static Assets SPA routing, and observability with query-string redaction. The deploy command is reproducible from the lockfile:

```bash
npm ci
npx wrangler login
npm run deploy
```

Deployment does not create billing or paid services. Confirm the account plan and Workers AI allocation in the Cloudflare dashboard before operational use; the deployment evidence in this repository does not infer a plan from a successful upload. The current public URL is [calivryn.delealufejoel.workers.dev](https://calivryn.delealufejoel.workers.dev).

For a genuine release smoke test against that URL:

```bash
npm run live-smoke
```

The script loads the synthetic sample in a real browser, calls the live Worker/AI binding, validates the returned model result, acknowledges review, downloads the PDF, checks origin/content-type failures, and records a safe rate-limit sequence. It does not induce a provider outage. The recorded evidence is [docs/evidence/live-smoke.json](docs/evidence/live-smoke.json) and [the exported PDF](docs/evidence/live-smoke-report.pdf).

## Verification evidence

The verified local candidate currently has:

- 29 passing Vitest tests across four files, including deterministic boundary cases, CSV input, Worker failure paths, prompt-injection resistance, review invalidation, and PDF generation.
- 3 passing Playwright browser tests covering sample import, unavailable-model recovery, human review, and browser PDF download.
- Passing TypeScript checks and production build.
- `npm audit --omit=dev` and `npm audit` reporting zero vulnerabilities after updating jsPDF and Vitest to fixed published versions.
- Live deployed analysis with model `@cf/google/gemma-4-26b-a4b-it`, five synthetic points, `OUTSIDE` as-found, `WITHIN` as-left, grounded observations, and a 7,581-byte two-page PDF export. See the dated evidence files above.

The GitHub Actions workflow runs `npm ci`, typecheck, unit tests, build, and Playwright browser tests. The final CI run and merged source commit are linked from the repository's [Actions page](https://github.com/ometere123/Calivryn/actions) and the release closeout.

## DEV Hacktoberfest Week 2 submission

The ready-to-publish English article follows the official sections—What I Built, Demo, Code, How I Built It, Why Does Open Innovation Matter?, My Agent Session, My First User, and Prize Categories—without inventing customers or contest outcomes:

- [Complete DEV submission copy](docs/DEV_SUBMISSION.md)
- [Demonstration recording plan](docs/DEMO_PLAN.md)

The intended categories are the overall **Side Hustle** award and **Best Use of Gemma**, subject to DEV's rules and judge eligibility. The article uses `#devchallenge` and `#hf26challenge`. It does not claim a paying customer, calibration record, guaranteed eligibility, or victory.

## Licence and model terms

Project-owned source is MIT-licensed in [LICENSE](LICENSE). Google's Gemma weights, usage conditions, and Cloudflare Workers AI service terms are separate and are not relicensed by this repository. Review the current [Gemma terms](https://ai.google.dev/gemma/terms) and [Cloudflare model documentation](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/) before commercial use.
