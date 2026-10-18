# Demonstration and test evidence plan

**Do not represent the following as already completed.** Collect actual dated screenshots, CLI output and links.

## Test matrix

| Test | Expected result |
|---|---|
| Sample import | Five openly synthetic points load, with provenance banner |
| CSV invalid header | Explicit rejection; no AI attempt |
| Two point IDs varying only in case | Validation failure |
| Zero, negative or non-numeric tolerance | Validation failure |
| Error exactly equals tolerance | Within tolerance |
| Error exceeds tolerance by 0.00000001 | Outside tolerance |
| 40 points | Full PDF includes all points and values |
| Cross-origin request | HTTP 403, no AI call |
| Spoofed pass/fail in client payload | Recalculation and server-supplied assessment |
| Gemma responds with nonexistent point ID | 502, no fabricated report |
| Gemma unavailable/quota used | Honest 503 or 429, error displayed |
| User changes data after generation | Previous analysis and review are invalidated |
| Approval unchecked | Export disabled |
| Re-review/edit narrative | Approval reset, content preserved for review |
| Mobile screen | Usable upload, editing, review and report generation |
| Real provider smoke test | Actual Cloudflare-bound inference and validated content; not mocks |

## Dev.to article evidence

Include a truthful motivation, open-weight AI relevance, customer persona and pricing hypothesis, architecture with verified deployed URL, public repository, sample CSV, genuine live-inference demo, credible test results, limitations, attribution/licensing, and `#devchallenge #hf26challenge`. Never claim genuine customers, actual calibration certification, CI success or deployed inference without links/evidence.
