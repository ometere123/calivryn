---
title: "When the meter stops, the report still has to be right"
published: false
tags: devchallenge, hf26challenge
cover_image: "https://raw.githubusercontent.com/ometere123/Calivryn/main/docs/screenshots/home-desktop.png"
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I built

When a calibration technician finishes the measurement work, the administrative work is not finished. The readings still have to become a report that another person can understand and trust. That often means copying values between spreadsheets, calculating deviations, checking tolerances, and writing an explanation from memory.

Calivryn is a public service-report preparation tool for independent calibration technicians, instrumentation contractors, and small service teams. It accepts a CSV of readings, calculates the authoritative result, asks Gemma for a narrow evidence-linked interpretation, puts that interpretation in front of a technician, and exports a reviewed PDF.

The application is a genuine seven-route product rather than one long form:

- `/` is a concise product landing page.
- `/app/capture` imports CSV data and collects job, instrument, and technician context.
- `/app/verify` exposes the editable measurements and exact results.
- `/app/analyse` performs real Cloudflare Workers AI inference.
- `/app/review` makes the narrative editable and requires acknowledgement.
- `/app/export` produces the final browser PDF.
- `/methodology` explains the numerical method, AI boundary, privacy, and limitations.

The customer is specific: a technician who already has readings but loses time preparing consistent service reports. My pricing is only a hypothesis: a low-cost pay-per-report option or a small monthly workspace plan priced below the time saved. I have not invented a customer, payment, revenue, or real calibration record.

## Demo

Try the [deployed application](https://calivryn.delealufejoel.workers.dev) and choose **Try sample workflow** on the home page. The demonstration uses five fictional pressure-transmitter points. It is labelled synthetic throughout and does not represent an instrument or an accredited result.

![Calivryn verification route showing five measurement points and deterministic results](https://raw.githubusercontent.com/ometere123/Calivryn/main/docs/screenshots/verify-desktop.png)

The verification view shows the signed error, absolute error, tolerance comparison, and as-found/as-left outcome. In the recorded production smoke run, one of five points was within tolerance as-found, all five were within tolerance as-left, and all five points improved.

![Calivryn review route showing editable evidence-linked observations and technician acknowledgement](https://raw.githubusercontent.com/ometere123/Calivryn/main/docs/screenshots/review-desktop.png)

The [live smoke record](https://github.com/ometere123/Calivryn/blob/main/docs/evidence/live-smoke.json) captures the seven route checks, exact model identifier, Worker calculation, grounded response, review acknowledgement, security probes, and browser export. The [generated sample PDF](https://github.com/ometere123/Calivryn/blob/main/docs/evidence/live-smoke-report.pdf) is the output of that workflow. It is a two-page report with the readings, signed errors, evidence-linked interpretation, provenance, acknowledgement, and disclaimer.

I have not published a video or presented a recording plan as a recording. The repository contains an honest [demonstration plan](https://github.com/ometere123/Calivryn/blob/main/docs/DEMO_PLAN.md) for anyone who wants to record the deployed workflow with the synthetic dataset.

## Code

The project is open source at [github.com/ometere123/Calivryn](https://github.com/ometere123/Calivryn).

The most relevant paths are:

- [`shared/calibration.ts`](https://github.com/ometere123/Calivryn/blob/main/shared/calibration.ts), the shared input grammar and decimal calculation;
- [`src/lib/session.tsx`](https://github.com/ometere123/Calivryn/blob/main/src/lib/session.tsx), the in-memory report session and invalidation rules;
- [`src/App.tsx`](https://github.com/ometere123/Calivryn/blob/main/src/App.tsx), the seven-route React Router structure;
- [`worker/index.ts`](https://github.com/ometere123/Calivryn/blob/main/worker/index.ts), the API boundary and independent recalculation;
- [`worker/model.ts`](https://github.com/ometere123/Calivryn/blob/main/worker/model.ts), the native Workers AI call and response validation;
- [`src/lib/pdf.ts`](https://github.com/ometere123/Calivryn/blob/main/src/lib/pdf.ts), the source-matched PDF export.

The [verified green CI run](https://github.com/ometere123/Calivryn/actions/runs/39174887202) covers the application release source. The repository also contains the [test plan](https://github.com/ometere123/Calivryn/blob/main/docs/TEST_PLAN.md), [architecture notes](https://github.com/ometere123/Calivryn/blob/main/docs/ARCHITECTURE.md), and [security record](https://github.com/ometere123/Calivryn/blob/main/docs/SECURITY.md).

## How I built it

The locked stack is TypeScript, React, React Router 7, Vite, Tailwind CSS, one Cloudflare Worker with Static Assets, Cloudflare Workers AI, PapaParse, `decimal.js`, Zod, jsPDF, Vitest, Playwright, npm, Wrangler, and GitHub Actions. There is no database, authentication, persistent report storage, external model API, Vercel, Railway, Ollama, blockchain, or payment system.

The first interface composition put the marketing hero and all five stages on one long page. That made the product feel like a form below a landing page and made orientation difficult on a small screen. I restructured it into a standalone home page, five task-specific routes, and a methodology page inside one persistent workspace shell. The shell keeps an in-memory session alive across valid route changes, but a refresh honestly resets it and redirects a nested route to Capture. Route guards prevent premature Review or Export access.

The calculation path is intentionally boring. A finite decimal grammar rejects blank values, `NaN`, `Infinity`, scientific notation, zero or negative tolerances, duplicate IDs, unexpected properties, oversized input, and more than 40 points. The browser calculates a preview with `decimal.js`. The Worker validates the same request, recalculates it independently, and sends structured evidence plus explicitly untrusted technician notes to `env.AI.run()` with the exact model `@cf/google/gemma-4-26b-a4b-it`.

Gemma drafts a summary, observations, and follow-up actions. Its JSON must satisfy a strict schema, and every cited point ID must exist. The browser compares the returned calculation to its own result. The technician can edit the narrative, but must acknowledge it before export. The PDF exporter checks the source and narrative again and prints the full-precision values, notes, provenance, acknowledgement, and non-accreditation disclaimer.

The engineering problems were concrete. The original dataset path needed case-insensitive duplicate detection. Fixed-height PDF elements could overflow with long Unicode units. The API media-type check needed to reject `application/jsonp`, and model output needed browser-side grounding checks as well as Worker-side checks. The final browser tests also caught an important distinction: SPA history preserves the session, while a hard reload must not pretend that an in-memory report still exists.

The verified source has 29 passing Vitest tests across four files, 3 passing Playwright tests, passing TypeScript and production build checks, and zero vulnerabilities from both `npm audit --omit=dev` and `npm audit`. The browser suite intercepts its model response so CI needs no Cloudflare credential. The separate smoke artifact is the evidence for the real inference call, not a mocked test response.

## Why does open innovation matter?

Calivryn uses Google's open-weight Gemma 4 model for the language layer, served through Cloudflare Workers AI. The exact model is visible in the source, health response, live evidence, and report provenance. That makes the AI boundary inspectable and gives the project a clearer path to model replacement than an unnamed closed assistant.

Open innovation matters here because the model is not being asked to own the measurement decision. The open-weight model contributes readable technical interpretation while the source readings, tolerance arithmetic, and final responsibility remain outside the model. A closed API could also generate prose, but this design keeps the model choice, boundary, schema, and grounding rules visible instead of hiding them behind a generic answer endpoint.

Cloudflare makes the public demonstration practical without operating a GPU service. That does not make the processing local. During analysis, readings, metadata, and technician notes cross to Cloudflare Workers AI, and provider terms, operational logs, and retention policies remain applicable. I do not claim local-only inference, zero provider-side retention, guaranteed provider availability, or paid customer usage.

## Prize categories

The Week 2 theme is **Side Hustle**. Calivryn is aimed at a small, specific workflow that an independent technician or service team might plausibly pay to simplify. The pricing discussion above is a hypothesis, not evidence of revenue or customer adoption.

I am seeking consideration for **Best Use of Gemma** because the project uses Gemma as a bounded, evidence-linked interpretation layer and documents the exact model and provider boundary. These are category targets, not claims of eligibility, judging outcome, or victory. Project-owned source is MIT-licensed; Google's Gemma terms and Cloudflare service terms remain separate.

#devchallenge #hf26challenge
