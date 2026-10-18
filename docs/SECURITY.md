# Security and metrological limitations

- **No actual calibration certification:** acceptance thresholds are technician-supplied absolute engineering-unit values; no instrument standard, certificate, reference uncertainty, calibration lab accreditation, drift correction or safety authorisation is inferred.
- **Model is not an authority:** outputs are advisory narratives. The trusted computation is performed in shared deterministic decimal code and independently re-run by the Worker.
- **Prompt injection:** notes and instrument strings are explicitly marked untrusted in model instructions. The model has no tools and cannot alter numeric assessment. Narrative must validate against a strict schema and cite existing point IDs. These precautions reduce, not eliminate, manipulation or hallucination.
- **Transport and data retention:** browser-to-Worker traffic uses the deployed HTTPS endpoint. The app intentionally stores neither report data nor account IDs. Provider-level retention/logging may still apply. Do not promise zero provider-side retention or compliance with specific regulations without independent review.
- **Privacy:** real client metadata, readings and notes are sent to Cloudflare when AI is requested. The sample records are synthetic. Do not submit confidential data without authorisation.
- **Abuse limits:** reject >45 KB JSON and invalid schemas before inference; use Cloudflare native rate limits. Free Workers AI quotas stop or throttle responses and may vary. Native rate limiting is approximate and not an account-wide hard dollar budget.
- **Front-end security:** default React escaping; no dangerouslySetInnerHTML; no external script assets. Static _headers provides security headers. The Worker returns no-store JSON and no provider stack traces.
- **Content provenance:** report clearly distinguishes source records, measured errors and generated narrative. Technician approval is a UI acknowledgement, not identity verification or a cryptographic signature.

## Independent acceptance tests to perform before release

1. `npm install`, typecheck, tests, build and browser suite on supported Node and Wrangler.
2. Adversarial CSV with duplicate IDs, UTF-8 variations, malicious text, oversized file, zero/negative tolerance, decimal boundary and 40 points.
3. Explicitly try asking the AI through field notes to override pass/fail, invent a reference standard or leak data.
4. Real Cloudflare inference with valid payload; verify grounded JSON output against exact known point IDs.
5. Simulate 429 / 503 / malformed provider responses; ensure no downloadable report appears.
6. Render 1- and 40-point PDFs, inspect every page for missing digits, wrapping and pagination on mobile and desktop.
7. Check Cloudflare AI allocation and free-tier status; do not enable paid usage without authorisation.
