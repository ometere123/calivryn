# Calivryn architecture

Production URL: <https://calivryn.delealufejoel.workers.dev>

## Runtime shape

```text
Browser
  ├─ React + React Router 7 + Vite + Tailwind UI
  ├─ SessionProvider: one in-memory report session across /app/* routes
  ├─ PapaParse CSV parser + Zod validation
  ├─ decimal.js calculation preview
  ├─ same-origin POST /api/analyze
  └─ jsPDF export after technician acknowledgement
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

The official Cloudflare Vite plugin builds the React client and Worker together. Wrangler packages the Worker and client assets, and the Static Assets configuration supplies SPA fallback for the seven browser routes while `/api/*` is handled by the Worker first.

## Browser routes and shell

The public surface has exactly seven user-facing routes:

| Route | Component responsibility |
| --- | --- |
| `/` | Landing page and functional entry points. |
| `/app/capture` | CSV import, template/sample actions, metadata, and notes. |
| `/app/verify` | Editable source table and deterministic result preview. |
| `/app/analyse` | Live model request, exact model provenance, loading and failure states. |
| `/app/review` | Editable, evidence-linked narrative and human acknowledgement. |
| `/app/export` | Browser PDF preview and download. |
| `/methodology` | Technical, privacy, safety, and responsibility explanation. |

`src/App.tsx` mounts `BrowserRouter`, `SessionProvider`, public pages, and the persistent `WorkspaceShell`. The shell owns the shared header, desktop sidebar, mobile navigation panel, route notice, global error presentation, contextual sidebar, footer, and scroll-to-top behaviour. `StageGuard` prevents direct access to Verify, Analyse, Review, and Export when the required in-memory state is missing or invalid.

The `/app` layout route and its index redirect are implementation details for the shell; the product's navigable routes remain the seven paths above. Navigation uses real links and React Router history entries, so valid Back/Forward navigation keeps the current session. A hard reload creates a new provider and safely redirects later-stage paths to Capture rather than fabricating state.

## State and data ownership

The browser owns the current in-memory report draft, source points, preview calculation, model result, edited narrative, acknowledgement, and export status. `src/lib/session.tsx` is the central controller. The Worker owns no durable report state. Source readings and metadata are authoritative inputs; calculations are derived and recalculated server-side; the narrative is generated text; acknowledgement is a UI gate and not a digital signature.

There is no database, account, cookie session, report history, analytics event store, localStorage, or sessionStorage. The browser sends metadata, measurements, and notes to the Worker only when analysis is requested. The Worker sends sanitised structured evidence and untrusted notes to Cloudflare Workers AI. Provider-level processing and retention rules still apply.

Every source or relevant metadata edit increments the session version, aborts an in-flight request, clears analysis and edited narrative, removes approval and export state, and leaves source values available for correction. Editing review text removes approval and export eligibility. This makes invalidation explicit rather than silently reusing stale analysis.

## Trust boundaries

1. **CSV and form input → browser validation.** All fields are untrusted. PapaParse handles CSV quoting/CRLF; Zod rejects missing, blank, non-finite, scientific-notation, oversized, or unexpected values. Point IDs are unique case-insensitively.
2. **Browser → Worker.** The Worker requires JSON, checks the same-origin `Origin` when present, caps the body at 45 KB while streaming, rejects invalid UTF-8, and validates the full object again. No browser-supplied calculation is trusted.
3. **Worker → Workers AI.** The Worker sends structured calculated evidence plus notes explicitly labelled untrusted. The model has no tools or network capability and cannot write state or choose a numerical result.
4. **Workers AI → Worker.** The response is extracted from the documented non-streaming binding shape, parsed as JSON, validated against a strict Zod narrative schema, and checked so every cited point ID exists. Invalid or hallucinated output returns an error and never creates placeholder text.
5. **Worker → browser → PDF.** The browser compares the returned calculation to a fresh local calculation. The PDF exporter validates the edited narrative, recalculates and compares again, requires acknowledgement, and prints every entered/calculated value without rounding.

## Deterministic domain model

`shared/calibration.ts` defines the input grammar, `MAX_POINTS = 40`, `MAX_CSV_BYTES = 30_000`, metadata bounds, exact model ID, point results, narrative schema, and disclaimer. Decimal precision is configured above the maximum supported input size. Each point records signed and absolute as-found/as-left error, pass status against its own positive tolerance, and improvement/deterioration. Overall status is `WITHIN` only when every point passes.

The AI never determines pass/fail, invents measurements, selects standards, or certifies equipment. Its narrative is advisory and must be reviewed by a qualified technician.

## API

- `GET /api/health` returns the configured model ID and `LIVE_BINDING_REQUIRED`; it does not invoke AI.
- `POST /api/analyze` accepts `{ metadata, points }`, recalculates, applies edge-local abuse limits, calls the native binding, and returns `{ model, generatedAt, calculation, narrative }`.
- Other API paths return `404`; non-POST analysis requests return `405`.
- Failure statuses are `400` malformed JSON/UTF-8, `403` origin, `413` size, `415` media type, `422` schema, `429` throttling, `502` invalid model output, and `503` unavailable provider/configuration.

Responses are JSON, `no-store`, `nosniff`, no-referrer, frame-denied, and carry a restrictive API CSP. Static Assets receive the repository's `_headers` policy.

## Resource and deployment limits

The Worker uses simple rate-limit bindings of 4 requests/60 seconds per coarse IP key and 12 requests/60 seconds for a shared edge key. These are approximate edge controls, not an exact account-wide daily spending cap. Cloudflare Workers AI free allocation, regional capacity, and provider quotas can still produce errors. The project does not enable paid overages.

The deployment uses only Workers, Static Assets, Workers AI, and rate-limit bindings. The compatibility date is `2026-10-18`; observability has query-string redaction, and application code intentionally emits no report content.
