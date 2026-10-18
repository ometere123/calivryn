# System architecture

```text
Browser: React + Vite + Tailwind
  CSV import (PapaParse) -> schema validation (Zod)
  -> exact math preview (decimal.js)
  -> POST /api/analyze
       Cloudflare Worker (same hostname)
       - Origin/content type/body size checks
       - schema validation (Zod)
       - re-calculation with decimal.js (authoritative)
       - edge rate-limit bindings
       - native env.AI.run(@cf/google/gemma-4-26b-a4b-it)
       - strict narrative structure and point-ID citation validation
  <- calculated values + AI narrative or explicit error
  human edit and affirmative review
  -> jsPDF generated locally in browser
```

## Boundaries

The frontend is a single-page application served via the same Cloudflare Worker deployment's Static Assets. The backend defines only `GET /api/health` and `POST /api/analyze` and returns JSON. Neither route stores records. Calivryn has no authentication. The Worker disallows cross-origin `POST` with an Origin header, intentionally does not emit permissive CORS headers, and accepts a maximum 45 KB JSON payload. CSV limit is 30 KB, and the human-facing UI allows 1–40 points.

## Why AI is genuinely relevant

Raw field notes may contain irregular natural language about service activities and potential checks. The open-weight model converts that content, together with trusted computed facts, into short narrative summaries and review actions. The technical benefit is language interpretation, **not** numerical validity or autonomous approval. Since there is no real-world customer evaluation in this source bundle, improved speed or willingness-to-pay are unverified hypotheses.

## Failure handling

Invalid CSV -> rejected client-side with row reference. Invalid report JSON -> server 4xx before model call. Rate limit -> 429. Missing AI binding -> 503. Inference provider error -> 503. Malformed, incomplete or hallucinated citations -> 502, never a fabricated narrative. Any source-data edit invalidates approval and prior AI results. PDF generation compares its input against the confirmed deterministic result before export.

## Limits

Without state storage, native rate limiting cannot supply an exact daily quota or reliably distinguish people behind a shared IP. Free Workers AI quotas/capacity can interrupt service. Qualitative claims in generated text cannot be mechanically proved solely by schema or point citation validation; the product expressly requires technician review. Inputs are sent to Cloudflare to run the model.
