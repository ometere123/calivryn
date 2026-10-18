---
title: "When the meter stops, the report still has to be right"
published: false
tags: devchallenge, hf26challenge
cover_image: "Add a dark teal Calivryn workspace collage showing the five route labels Capture, Verify, Analyse, Review, and Export around a precise measurement table. Keep the image abstract and synthetic, with no customer data."
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12).*

## What I Built

When a calibration technician finishes the measurement work, the administrative work is not finished. The readings still have to become a report that another person can understand and trust. That often means copying values between spreadsheets, calculating deviations, checking tolerances, and writing an explanation from memory.

Calivryn is a public service-report preparation tool for independent calibration technicians, instrumentation contractors, and small service teams. It takes a CSV of reference readings, calculates the authoritative result, asks Gemma for a narrow evidence-linked interpretation, puts that interpretation in front of a technician, and exports a reviewed PDF.

The product now has a genuine seven-route experience:

- `/` is a concise product landing page.
- `/app/capture` imports CSV data and collects job, instrument, and technician context.
- `/app/verify` exposes the editable measurements and exact results.
- `/app/analyse` performs real Cloudflare Workers AI inference.
- `/app/review` makes the narrative editable and requires acknowledgement.
- `/app/export` produces the final browser PDF.
- `/methodology` explains the numerical method, AI boundary, privacy, and limitations.

The customer is specific: a technician who already has readings but loses time preparing consistent service reports. My pricing is only a hypothesis: a low-cost pay-per-report option or a small monthly workspace plan, priced below the time saved. I have not invented a customer, a payment, revenue, or a real calibration record.

## Demo

Try the [deployed application](https://calivryn.delealufejoel.workers.dev) and choose **Try sample workflow** on the home page. The sample is five fictional pressure-transmitter points. It is labelled synthetic throughout and does not represent an instrument or an accredited result.

The [live smoke record](https://github.com/ometere123/Calivryn/blob/main/docs/evidence/live-smoke.json) captures the public route checks, the exact model identifier, the Worker calculation, the grounded response, the review gate, and the browser export. The [generated sample PDF](https://github.com/ometere123/Calivryn/blob/main/docs/evidence/live-smoke-report.pdf) is the output of that workflow. The [real screenshots](https://github.com/ometere123/Calivryn/tree/main/docs/screenshots) show the home, workspace, responsive, review, and export views. The [recording plan](https://github.com/ometere123/Calivryn/blob/main/docs/DEMO_PLAN.md) describes a short authentic walkthrough.

The mathematics in the sample is deliberately visible. The browser shows the signed error `reading - reference`, the absolute error, the tolerance comparison, and the as-found/as-left outcome. The model is not asked to calculate those values. In the verified smoke workflow, the sample has an `OUTSIDE` as-found overall result and a `WITHIN` as-left overall result, with observations tied to existing point IDs.

## Code

The project is open source at <https://github.com/ometere123/Calivryn>.

The most relevant paths are:

- [`shared/calibration.ts`](https://github.com/ometere123/Calivryn/blob/main/shared/calibration.ts), the shared grammar and decimal calculation;
- [`src/lib/session.tsx`](https://github.com/ometere123/Calivryn/blob/main/src/lib/session.tsx), the in-memory report session and invalidation rules;
- [`src/App.tsx`](https://github.com/ometere123/Calivryn/blob/main/src/App.tsx), the seven-route React Router structure;
- [`worker/index.ts`](https://github.com/ometere123/Calivryn/blob/main/worker/index.ts), the API boundary and independent recalculation;
- [`worker/model.ts`](https://github.com/ometere123/Calivryn/blob/main/worker/model.ts), the native Workers AI call and response validation;
- [`src/lib/pdf.ts`](https://github.com/ometere123/Calivryn/blob/main/src/lib/pdf.ts), the source-matched PDF export.

The [final green GitHub Actions history](https://github.com/ometere123/Calivryn/actions) provides the source-matched CI record. The repository also contains the [test plan](https://github.com/ometere123/Calivryn/blob/main/docs/TEST_PLAN.md), [architecture](https://github.com/ometere123/Calivryn/blob/main/docs/ARCHITECTURE.md), and [security record](https://github.com/ometere123/Calivryn/blob/main/docs/SECURITY.md).

## How I Built It

The locked stack is TypeScript, React, React Router 7, Vite, Tailwind CSS, one Cloudflare Worker with Static Assets, Cloudflare Workers AI, PapaParse, `decimal.js`, Zod, jsPDF, Vitest, Playwright, npm, Wrangler, and GitHub Actions. There is no database, authentication, persistent report storage, external model API, Vercel, Railway, Ollama, blockchain, or payment system.

The first interface composition put the marketing hero and all five stages on one long page. That made the product feel like a form below a landing page, and it made orientation difficult on a small screen. I restructured it into a standalone home page, five task-specific routes, and a methodology page inside one persistent workspace shell. The shell keeps an in-memory session alive across valid route changes, but a refresh honestly resets it and redirects a nested route to Capture. Route guards prevent premature Review or Export access.

The calculation path is intentionally boring. A finite decimal grammar rejects blank values, `NaN`, `Infinity`, scientific notation, zero or negative tolerances, duplicate IDs, unexpected properties, oversized input, and more than 40 points. The browser calculates a preview with `decimal.js`. The Worker validates the same request, recalculates it independently, and sends structured evidence plus explicitly untrusted technician notes to `env.AI.run()` with the exact model `@cf/google/gemma-4-26b-a4b-it`.

Gemma drafts a summary, observations, and follow-up actions. Its JSON must satisfy a strict schema, and every cited point ID must exist. The browser compares the returned calculation to its own result. The technician can edit the narrative, but must acknowledge it before export. The PDF exporter checks the source and narrative again and prints the full-precision values, notes, provenance, acknowledgement, and non-accreditation disclaimer.

The work exposed concrete failures rather than only cosmetic issues. The original dataset path needed case-insensitive duplicate detection. Fixed-height PDF elements could overflow with long Unicode units. Dependency audit findings required safe published versions. The API media-type check needed to reject `application/jsonp`, and model output needed browser-side grounding checks as well as Worker-side checks. The final browser tests also caught an important distinction: SPA history preserves the session, while a hard reload must not pretend that an in-memory report still exists.

The final local verification is 29 passing Vitest tests across four files, 3 passing Playwright tests, passing TypeScript and production build checks, and zero vulnerabilities from both `npm audit --omit=dev` and `npm audit`. The browser suite intercepts its model response so CI needs no Cloudflare credential. The separate smoke artifact is the evidence for the real inference call.

## Why Does Open Innovation Matter?

Open-weight AI matters here because the language layer should be identifiable and replaceable, not a vague “AI assistant” hidden behind an unknown model choice. Calivryn records the exact Gemma model, keeps the prompt boundary visible, and sends structured evidence instead of asking a language model to do metrology arithmetic.

That approach also keeps the product economically plausible for a niche workflow. Cloudflare Workers AI makes a public demonstration possible without operating a GPU service, while the application remains explicit that inference data crosses to Cloudflare and provider retention policies apply. “Open” does not mean “local-only” or “zero retention”, and I have not claimed either.

The strongest part of the open approach is the boundary. Gemma can help a technician turn verified evidence into readable language, but the calculation, tolerances, source readings, and final human responsibility stay outside the model. That is more useful than a polished answer whose numerical authority is unclear.

## My Agent Session

I have not published a DevRelay session link. This repository is the build record: it contains the source, tests, CI workflow, live smoke JSON, generated PDF, screenshots, and technical documentation. The [demonstration plan](https://github.com/ometere123/Calivryn/blob/main/docs/DEMO_PLAN.md) is intentionally written for a real browser recording rather than a simulated model response.

## My First User

I do not have a paying first user or an external calibration record to report. The first-user hypothesis is the independent technician who already spends time turning a measurement sheet into a report. The synthetic sample demonstrates the workflow without pretending that a fictional dataset is customer feedback. That is also why the pricing discussion above is labelled a hypothesis.

## Prize Categories

- Overall **Side Hustle** award
- **Best Use of Gemma**

These are category targets, not claims of eligibility, judging outcome, or victory. Calivryn uses Gemma through Cloudflare Workers AI and links the exact model and service terms in the repository. Project-owned code is MIT-licensed; Google's Gemma terms and Cloudflare service terms remain separate.

The project is a small, specific tool someone could plausibly pay for, but the claims stop there. A technician still has to verify standards, traceability, units, uncertainty, instrument condition, and every statement before sharing a report.

#devchallenge #hf26challenge
