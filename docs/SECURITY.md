# Security, privacy and metrological boundaries

Calivryn prepares a technician-reviewed service report. It is not an accredited certificate system, traceability register, uncertainty calculator, compliance authority, or safety-to-operate decision engine.

## Controls implemented

- The seven-route React UI uses ordinary escaped text rendering. It has no `dangerouslySetInnerHTML`, embedded credential, client-side secret, analytics call, or unwanted external request.
- The persistent workspace shell contains one in-memory `SessionProvider`. It uses no localStorage, sessionStorage, cookie, database, account, or report-history mechanism. A hard reload intentionally discards the session and guarded routes redirect to Capture.
- Static Assets and API responses set restrictive security headers. The API also uses `no-store`, `nosniff`, no-referrer, frame denial, a restrictive CSP, and a restrictive Permissions Policy.
- CSV import accepts only the five required fields, enforces a 30 KB file limit, rejects parser errors, validates every row, and rejects duplicate IDs including case variants.
- Zod strict schemas reject unexpected JSON properties, malformed dates, blank values, scientific notation, `NaN`, `Infinity`, zero/negative tolerances, unsupported unit characters, and out-of-range text/point counts.
- The Worker streams and caps the request body at 45 KB, requires exact `application/json`, rejects invalid UTF-8, checks a supplied Origin against the request origin, and recalculates with `decimal.js` before AI execution.
- Cloudflare simple rate-limit bindings provide coarse per-IP and shared-edge throttles. They are abuse controls, not an account-wide spending or neuron budget guarantee.
- Technician notes are untrusted prompt data. Gemma has no tools and receives no credentials. Its response must be strict JSON, cite existing point IDs, stay inside bounded fields, and pass schema validation.
- Model prose cannot replace the authoritative calculation. The browser compares the Worker result to a fresh local calculation, and the PDF exporter recalculates and compares again.
- Source and relevant metadata edits invalidate analysis, edited narrative, approval, and export state. Export requires explicit technician acknowledgement.
- Provider errors, malformed output, quota errors, and invalid citations fail closed. No placeholder narrative or provider stack trace is returned.
- PDF text is escaped/sanitised for control characters, dynamically wrapped, and printed at entered/calculated precision. No PDF JavaScript, forms, URLs, or embedded remote content are used.

## Adversarial coverage

The test suite covers exact tolerance boundaries, negative readings, tiny permitted decimals, duplicate/case-variant IDs, blank values, invalid dates, non-finite values, scientific notation, zero/negative tolerances, 1–40 point bounds, unexpected properties, wrong media type, oversized bodies, hostile origins, malformed UTF-8, throwing provider bindings, malformed model JSON, phantom point IDs, contradictory technician notes, authoritative math preservation, review invalidation, and multi-page PDF output.

The browser suite additionally checks premature route access, hard-reload reset behaviour, browser history, responsive navigation, provider failure presentation, malformed browser responses, and PDF export. The live smoke run checks the public route fallback, exact model ID, grounded narrative, review acknowledgement, browser download, hostile-origin rejection, and wrong-content-type rejection. It does not induce a live provider outage.

## Privacy and retention

Before analysis, data stays in browser memory. When analysis is requested, metadata, readings, and technician notes cross the HTTPS boundary to Cloudflare Workers AI. Cloudflare and model-provider terms, operational logs, and retention policies remain applicable. Calivryn does not claim local-only processing, zero provider-side retention, regulatory compliance, or confidentiality beyond the platform controls.

Calivryn stores no reports, accounts, identifiers, cookies, analytics, or report history. Avoid uploading personal, confidential, or proprietary records without permission and an appropriate privacy review.

## Abuse and resource limitations

Request caps and edge rate limits reduce accidental or abusive consumption. The limits are approximate and location-scoped; they cannot enforce an exact account-wide daily neuron or spending cap, distinguish people behind shared IPs, or guarantee provider availability. Cloudflare Workers AI capacity and free allocation can interrupt service. The project does not enable paid overages.

## Residual risk

Natural-language model claims cannot be fully proven by a schema and point citation alone. A malicious or contradictory note can influence prose, and a model can make a qualitative claim that requires human judgement. The product therefore keeps the human review gate and prints the original notes and limitations. A qualified technician must verify standards, traceability, units, method, uncertainty, instrument condition, and every report statement before sharing it.

## Verification commands

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run build
npm audit --omit=dev
npm audit
npm run live-smoke
```

The last command requires the deployed Worker and writes synthetic evidence under `docs/evidence/`; it does not prove account plan status or induce a provider outage.
