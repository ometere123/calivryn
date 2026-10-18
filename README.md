# Calivryn

**Precision is measured. Clarity is generated.**

Calivryn is an open-source calibration **service report preparation** application. It evaluates technician-supplied measurement data with deterministic decimal arithmetic, calls the actual Google Gemma 4 26B A4B open-weight model through Cloudflare Workers AI to create an evidence-linked narrative, requires human review, and exports a PDF in the user's browser.

> **Not an accredited calibration certificate.** Calivryn does not verify traceability, measurement uncertainty, reference standards, instrument condition or safety-to-operate. The technician supplies and assumes responsibility for the tolerance criteria and report contents.

## Current verification status

This repository contains the source handoff. **No live Cloudflare deployment, real Gemma inference evidence, dependency installation or green CI is asserted by this README.** Those must be independently demonstrated, linked and dated before claiming the application is deployment-verified.

## Stack

TypeScript · React 19 · Vite 7 · Tailwind CSS 4 · Cloudflare Workers and Static Assets · Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`) · decimal.js · PapaParse · Zod · jsPDF · Vitest · Playwright · Wrangler 4 · GitHub Actions.

There is no application database, user account, billing, blockchain, Railway, Vercel, Ollama or externally purchased model API key. **Cloudflare account authentication is required for deployment**; the Free plan is subject to usage/capacity limits and its current product terms.

## Local development

Requirements: Node.js 22+ and npm; an authenticated Cloudflare account with Workers AI access for genuine inference. No source file contains credentials.

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run test:e2e
npm run build
npx wrangler login
npm run deploy
```

The frontend and API routes are served together by the official Cloudflare Vite plugin. `GET /api/health` only checks routing/configured model identifier; it **does not prove that AI inference works**. A genuine analysis must be submitted to `POST /api/analyze` with an actual Workers AI binding.

For reproducible CI, generate and commit `package-lock.json` using `npm install` in a network-enabled environment, change CI's install step to `npm ci`, rerun quality/e2e jobs, and capture their links. This source package deliberately does not supply a fabricated lockfile.

## Input contract

Use exactly this CSV header in any column order:

```csv
point_id,reference,as_found,as_left,tolerance
P00,0,0.11,0.01,0.05
P25,2.5,2.59,2.52,0.05
```

- 1–40 points, CSV up to 30 KB, one explicit unit shared by all points.
- Point IDs must be unique ignoring case, 1–20 characters, start with a letter and contain only letters, digits, `_` and `-`.
- All values are **plain finite decimals** with at most 12 integer and 8 fractional digits; scientific notation is intentionally rejected. No implicit percent/full-scale conversion occurs.
- `tolerance` is a strictly positive **absolute tolerance** in the same common unit as `reference`, `as_found` and `as_left`.
- Service metadata are mandatory; technician notes are up to 2,000 characters. A synthetic example is included and labelled non-real.

### Exact mathematical rules

For each point:

```
signed error = measured reading - reference
absolute error = |signed error|
within tolerance ⇔ absolute error ≤ positive tolerance
change = improved if |left error| < |found error|, unchanged if equal, deteriorated otherwise
overall within tolerance ⇔ every individual point is within its user-supplied tolerance
```

These are deterministic comparisons using `decimal.js`, with a second calculation in the Worker rather than accepting the browser's results. **No AI model chooses a measurement's pass/fail value.** Results describe only the provided tolerance, not metrological uncertainty or accredited conformance.

## End-to-end workflow

1. Capture — upload and validate a CSV, enter job details, or load the openly synthetic sample.
2. Verify — edit values, inspect exact signed errors, within/outside assessments and data-validation failures.
3. Analyse — call the real Gemma 4 Workers AI binding; reject invalid JSON and references to non-existent point IDs.
4. Review — edit AI summary, observations and follow-up items; explicitly acknowledge technician review.
5. Export — generate a multi-page PDF with source data, arithmetic, AI output, original notes, provenance, caveats and review acknowledgment.

Changing source measurements or metadata invalidates prior AI output and approval. Model failures, malformed responses, 429s and provider outages display errors rather than placeholder content.

## Privacy & security

- Input stays in the browser before AI analysis; when analysis is requested, metadata, readings and notes are transmitted to Cloudflare Workers AI. **This is not an offline/private-local AI system.** Provider processing and platform log practices are governed by Cloudflare terms.
- Calivryn implements no intentional database, account, report history, analytics or localStorage persistence.
- The Worker validates the request again, limits body size to 45 KB, restricts origins, requires JSON and rate-limits model calls by a coarse client IP plus an edge-level shared throttle.
- Rate limits operate per Cloudflare location. They **do not enforce an exact account-wide daily neuron budget**; the operator must monitor the free AI allocation in Cloudflare. Never enable paid overages without approval.
- Synthetic data are supplied for demonstrations. Do not upload identifiable or confidential customer data without lawful permission.

See [architecture](docs/ARCHITECTURE.md) and [risk boundaries](docs/SECURITY.md).

## Testing

```bash
npm run test          # math, invalid inputs, Worker validation and model failures
npm run typecheck
npm run build
npm run test:e2e      # browser test against local Cloudflare Vite environment
```

Unit tests may stub the model to assert rejection behavior; **only a publicly hosted smoke test with real `env.AI.run()` proves working inference**. Neither mock tests nor the health endpoint may be presented as live-inference evidence.

## Open source, model terms and contest

Original Calivryn application code is MIT-licensed; Gemma model weights, usage and Cloudflare service conditions are **separate** and are not relicensed by this repository. Check Google's current Gemma model terms before deploying commercially.

Built for the DEV Hacktoberfest 2026 Side Hustle challenge (October 12–18 PDT). The original build dates and contest eligibility must be independently evidenced. The product addresses technicians who currently prepare service reports from raw calibration readings; pay-per-report is a **pricing hypothesis, not proof of actual paying customers**.

The target repository is https://github.com/ometere123/Calivryn.

## Source references

- [Cloudflare Gemma 4 26B A4B model docs](https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/)
- [Cloudflare Vite plugin React guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Cloudflare Workers rate limit binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [DEV challenge page](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)

No completion, security audit or competition success is guaranteed by this source handoff. Demonstrable outcomes take priority over claims.
