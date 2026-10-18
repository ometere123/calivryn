# Calivryn architecture

Production URL: <https://calivryn.delealufejoel.workers.dev>

## Runtime shape

```text
Browser
  ├─ React + Vite + Tailwind UI
  ├─ PapaParse CSV parser
  ├─ Zod input validation
  ├─ decimal.js calculation preview
  ├─ same-origin POST /api/analyze
  └─ jsPDF export after review acknowledgement
       │
       ▼
Cloudflare Worker
  ├─ content type, Origin, body-size and UTF-8 checks
  ├─ strict Zod validation
  ├─ independent decimal.js recalculation
  ├─ two simple Cloudflare rate-limit bindings
  ├─ env.AI.run('@cf/google/gemma-4-26b-a4b-it')
  └─ strict narrative and point-ID validation
       │
       ▼
Cloudflare Static Assets + Workers AI
```

The official Cloudflare Vite plugin builds the React client and Worker together. Wrangler's redirected build configuration packages both the Worker and the client assets. SPA fallback is enabled for client navigation and `/api/*` is routed to the Worker first.

## State and data ownership

The browser owns the current in-memory report draft, source points, preview calculation, model result, edited narrative, and acknowledgement state. The Worker owns no durable report state. The source readings and metadata are the source of truth; calculations are derived and recalculated server-side; the narrative is untrusted generated text; the technician acknowledgement is a UI confirmation and not a signature.

There is no database, account, cookie session, report history, analytics event store, or localStorage persistence. The browser sends metadata, measurements, and notes to the Worker only when analysis is requested. The Worker then sends the sanitized structured payload to Cloudflare Workers AI. Provider-level processing and retention rules still apply.

## Trust boundaries

1. **CSV and form input → browser validation.** All fields are untrusted. PapaParse handles CSV quoting/CRLF; Zod rejects missing, blank, non-finite, scientific-notation, oversized, or unexpected values. Point IDs are unique case-insensitively.
2. **Browser → Worker.** The Worker requires JSON, checks the same-origin `Origin` when present, caps the body at 45 KB while streaming, rejects invalid UTF-8, and validates the full object again. No browser-supplied calculation is trusted.
3. **Worker → Workers AI.** The Worker sends structured computed evidence plus notes explicitly labelled untrusted. The model has no tools or network capability. It cannot write state or select a numerical result.
4. **Workers AI → Worker.** The response is parsed from the documented non-streaming binding shape, validated against a strict Zod schema, and checked so every cited point ID exists exactly. Invalid or hallucinated output returns an error; it never creates a placeholder narrative.
5. **Worker → browser → PDF.** The browser compares the returned calculation to a fresh local calculation. The export function repeats the comparison, requires acknowledgement, validates the edited narrative, and prints every source/calculated value without rounding.

## Deterministic domain model

The shared module defines the input grammar, `MAX_POINTS = 40`, `MAX_CSV_BYTES = 30_000`, metadata bounds, the exact model ID, point results, narrative schema, and disclaimer. Decimal precision is configured above the maximum supported input size. Each point records signed and absolute as-found/as-left error, pass status against its own positive tolerance, and improvement/deterioration. Overall status is `WITHIN` only when every point passes.

The AI never determines pass/fail, invents measurements, selects standards, or certifies equipment. Narrative text is advisory and must be reviewed by a qualified technician.

## API

- `GET /api/health` returns the configured model ID and `LIVE_BINDING_REQUIRED`; it does not invoke AI.
- `POST /api/analyze` accepts `{ metadata, points }`, recalculates, applies edge-local abuse limits, calls the native binding, and returns `{ model, generatedAt, calculation, narrative }`.
- Other API paths return `404`; non-POST analysis requests return `405`.
- Failure statuses are `400` malformed JSON/UTF-8, `403` origin, `413` size, `415` media type, `422` schema, `429` throttling, `502` invalid model output, and `503` unavailable provider/configuration.

Responses are JSON, `no-store`, `nosniff`, no-referrer, frame-denied, and carry a restrictive API CSP. Static Assets receive the repository's `_headers` security policy.

## Resource and deployment limits

The Worker uses simple rate-limit bindings of 4 requests/60 seconds per coarse IP key and 12/60 seconds for a shared edge key. These are approximate edge controls, not an exact account-wide daily spending cap. Cloudflare Workers AI Free allocation and capacity can still produce provider errors; the operator must monitor allocation in Cloudflare and must not enable paid overages without an explicit decision.

The deployment uses only Workers, Static Assets, Workers AI, and rate-limit bindings. The compatibility date is `2026-10-18`; logs/traces are enabled with query-string redaction, but application code intentionally emits no report content.
