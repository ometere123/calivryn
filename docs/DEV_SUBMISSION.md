---
title: "Calivryn: deterministic measurement evidence with Gemma-assisted reporting"
published: false
tags: devchallenge, hf26challenge
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

Calivryn helps independent calibration and instrumentation technicians turn a CSV of readings into a defensible service-report draft.

The customer problem is small but consequential: after a field or bench check, a technician still has to calculate signed deviations, compare every point to a tolerance, explain what changed, and prepare a client-facing document. Copying that workflow between spreadsheets and prose makes it easy to lose a sign, misread an exact tolerance boundary, or write a confident sentence that is not supported by a reading.

Calivryn's workflow is Capture → Verify → Analyse → Review → Export. It accepts 1–40 points, calculates exact decimal results twice—once in the browser and again in a Cloudflare Worker—and asks Gemma for a short evidence-linked narrative. Gemma cannot determine pass/fail, choose a standard, invent a measurement, or certify equipment. The technician edits the narrative and acknowledges it before the browser exports a multi-page PDF.

The target customer is an independent calibration technician, instrumentation contractor, or small service team. My pricing hypothesis is a low-cost pay-per-report or small monthly plan priced below the time saved on repetitive report preparation. I have not claimed a paying customer, revenue, or production calibration record.

## Demo

Try the deployed application: <https://calivryn.delealufejoel.workers.dev>

The synthetic demonstration uses five fictional pressure-transmitter points. The verified live smoke run returned Gemma model `@cf/google/gemma-4-26b-a4b-it`, calculated `OUTSIDE` as-found and `WITHIN` as-left, produced citations for existing point IDs, required review acknowledgement, and downloaded `calivryn-PT-204-DEMO-2026-10-18.pdf`.

Evidence: [live smoke JSON](https://github.com/ometere123/Calivryn/blob/main/docs/evidence/live-smoke.json) and [the generated PDF](https://github.com/ometere123/Calivryn/blob/main/docs/evidence/live-smoke-report.pdf).

The repository also contains [desktop/mobile screenshots](https://github.com/ometere123/Calivryn/tree/main/docs/screenshots) and a [recording plan](https://github.com/ometere123/Calivryn/blob/main/docs/DEMO_PLAN.md). The recording should use synthetic data only.

## Code

The project is open source at <https://github.com/ometere123/Calivryn>.

Relevant code paths are [`shared/calibration.ts`](https://github.com/ometere123/Calivryn/blob/main/shared/calibration.ts) for validation and deterministic math, [`worker/index.ts`](https://github.com/ometere123/Calivryn/blob/main/worker/index.ts) for the API boundary, [`worker/model.ts`](https://github.com/ometere123/Calivryn/blob/main/worker/model.ts) for the native Workers AI call and response validation, and [`src/lib/pdf.ts`](https://github.com/ometere123/Calivryn/blob/main/src/lib/pdf.ts) for the reviewed PDF export.

## How I Built It

The stack is TypeScript, React, Vite, Tailwind CSS, one Cloudflare Worker with Static Assets, Cloudflare Workers AI, PapaParse, `decimal.js`, Zod, jsPDF, Vitest, Playwright, npm, Wrangler, and GitHub Actions. It deliberately has no database, authentication, persistent report storage, external model API, Vercel, Railway, Ollama, or paid infrastructure.

The browser validates CSV and metadata, then renders the calculation preview. The Worker validates the same request again, recalculates authoritative results, applies body/origin/media-type checks and edge-local throttles, and calls the native `env.AI.run()` binding with the pinned Gemma model. The prompt marks technician notes as untrusted data. The returned JSON must fit a strict schema and every observation/action must cite an existing point ID. The browser compares the returned calculation to its own calculation before allowing review/export.

The first implementation pass was useful but not sufficient. During hardening I found and repaired three concrete issues: the CSV path validated each row but did not reject case-variant duplicate IDs as a complete dataset; the PDF used fixed-height measurement cards that could overflow with long Unicode units; and `npm audit` found advisories in the original jsPDF/Vitest versions. The final source adds dataset-level duplicate checks, wrapped PDF cards and fixed dependency versions. I also tightened the API media-type check from a prefix match to an exact `application/json` MIME type and added API security headers.

The most important design choice is that the model is not in charge of the measurement result. An incorrect or malicious note can influence generated wording, so the report prints the original note, requires technician review, and never replaces the Worker calculation with model prose.

The candidate has 29 passing Vitest tests across four files, 3 passing Playwright tests, passing typecheck/build, and zero findings from both `npm audit --omit=dev` and `npm audit`. The browser suite is intentionally mocked; the separate smoke evidence proves the real live binding call.

## Why Does Open Innovation Matter?

Open-weight Gemma makes the language layer identifiable and portable as a model rather than an opaque “AI assistant” label. The application pins the exact model ID, records the model provenance in the PDF, sends structured evidence instead of asking the model to do arithmetic, and keeps the model's role narrow enough to review and replace without changing the measurement method.

That matters for a niche professional workflow. A generic closed API could write polished prose, but it would not by itself create a defensible boundary between authoritative calculation and generated interpretation. Calivryn's open-AI choice is valuable because it keeps the model choice visible while the system design makes deterministic math, grounded citations, and human responsibility non-negotiable.

## My Agent Session

I did not publish a DevRelay session link. The public repository, dated live smoke artifact, screenshots, test suite, CI workflow, and this write-up are the available build record.

## Prize Categories

- Overall **Side Hustle** award
- **Best Use of Gemma**

This is an honest category target, not a claim of eligibility or victory. The application uses Gemma through Cloudflare Workers AI and links the exact model and service terms in the repository. The project is MIT-licensed for project-owned code; Google's Gemma terms and Cloudflare service terms remain separate.

#devchallenge #hf26challenge
