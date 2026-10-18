# Calivryn test plan and evidence

## Automated suites

| Suite | Command | Result | Coverage |
| --- | --- | ---: | --- |
| TypeScript | `npm run typecheck` | PASS | React routes, session controller, Worker, shared contracts |
| Unit/Worker/PDF/CSV | `npm run test` | 29 passed | Math, input, Worker failures, AI response validation, review/export invariants |
| Browser | `npm run test:e2e` | 3 passed | Seven-route navigation, guards, responsive navigation, mocked schema-valid analysis, provider/malformed-response failure, review, PDF download, new report, history, invalidation |
| Production build | `npm run build` | PASS | Cloudflare Worker and Static Assets build |
| Runtime audit | `npm audit --omit=dev` | 0 vulnerabilities | Production dependency tree |
| Full audit | `npm audit` | 0 vulnerabilities | Runtime and development dependency tree |

The browser suite uses an intercepted API response by design. It is credential-free and must not be described as live model evidence. Live inference is recorded separately by `npm run live-smoke` against the deployed Worker.

## Route and lifecycle matrix

| Check | Expected result | Evidence |
| --- | --- | --- |
| Direct home entry | `/` renders the standalone landing page | Playwright and `home-*` screenshots |
| Landing navigation | Launch opens `/app/capture`; methodology and repository links work | Playwright |
| Direct nested-route reload | Fresh reload redirects later stages to Capture with an in-memory explanation | Playwright |
| Synthetic sample | Five labelled synthetic points load and enter Verify | Playwright and live smoke |
| Metadata editing | Capture edits are visible and invalidate downstream work | Playwright |
| Verify calculations | Exact signed errors, status counts, and improvement are shown | Unit tests and Playwright |
| Browser history | Back/Forward preserves a valid mounted session | Playwright |
| Mobile navigation | Compact menu opens, closes, and changes route | Playwright and mobile screenshots |
| Live analyse | Real Gemma 4 response arrives through `/api/analyze` | Live smoke JSON |
| Provider failure | Honest error remains visible and no review narrative is fabricated | Playwright and Worker tests |
| Malformed/phantom model output | `502`/client rejection; no review state | Playwright and Worker tests |
| Technician review | Narrative is editable and acknowledgement is explicit | Playwright |
| Export | Browser downloads the source-matched PDF only after acknowledgement | Playwright and live PDF |
| New report | Session clears and returns to Capture | Playwright |
| Methodology and source links | Technical explanation and repository links are functional | Playwright |

## Functional and adversarial matrix

| Check | Expected result | Evidence |
| --- | --- | --- |
| Real CSV with quoted/CRLF fields | PapaParse preserves valid decimal strings | `tests/csv.test.ts` |
| Wrong/extra/duplicate headers | Explicit rejection | `tests/csv.test.ts` |
| Duplicate IDs differing only by case | Rejection before analysis | `tests/csv.test.ts`, `tests/worker.test.ts` |
| Exact error equal to tolerance | `WITHIN` | `tests/calibration.test.ts` |
| Error beyond tolerance by `0.00000001` | `OUTSIDE` | `tests/calibration.test.ts` |
| Negative readings and signed errors | Correct sign and deterioration | `tests/calibration.test.ts` |
| Tiny permitted decimals | Accepted and compared exactly | `tests/calibration.test.ts` |
| Scientific notation, NaN, Infinity, blank values | Rejection | `tests/calibration.test.ts`, `tests/csv.test.ts` |
| 1–40 points | Accepted within bound; 41 rejected | `tests/csv.test.ts`, `tests/pdf.test.ts` |
| Unexpected JSON properties | Rejection before AI | `tests/worker.test.ts` |
| Wrong content type | `415`, no AI call | `tests/worker.test.ts`, live smoke |
| Oversized request | `413`, no AI call | `tests/worker.test.ts` |
| Hostile Origin | `403`, no AI call | `tests/worker.test.ts`, live smoke |
| Personal/global throttle | `429`, no AI call | `tests/worker.test.ts` |
| Prompt injection and contradictory notes | Notes remain untrusted; authoritative math unchanged | `tests/worker.test.ts` |
| Malformed/phantom model output | `502`, no fabricated narrative | `tests/worker.test.ts`, browser suite |
| Provider exception | Safe `503`, provider details absent | `tests/worker.test.ts` |
| Changed data after analysis | Prior result, approval, and export state invalidated | Browser suite and PDF tests |
| Approval absent | Export refused | Browser suite and PDF tests |
| Long Unicode unit/notes | PDF wraps and remains readable | `tests/pdf.test.ts`, live PDF |
| 40-point PDF | More than one page with all rows | `tests/pdf.test.ts` |

## Live smoke evidence

The dated [live evidence](evidence/live-smoke.json) is collected against <https://calivryn.delealufejoel.workers.dev> using the synthetic dataset and the actual public deployment. It records:

- seven-route SPA fallback checks;
- health response and exact model ID;
- one actual browser-generated Gemma narrative with existing point references;
- Worker-authoritative `OUTSIDE` as-found and `WITHIN` as-left results;
- responsive screenshots, technician acknowledgement, and downloaded PDF filename/size;
- hostile-origin and wrong-content-type failures;
- a small safe sequence of additional requests to observe edge throttling.

The sequence is evidence of that run only. If it does not produce `429`, it must not be used to claim an account-wide quota. A real provider outage is not induced; the throwing-binding Worker regression test covers recovery behaviour without disrupting the public service.

## Manual acceptance

Inspect the screenshots under [`docs/screenshots`](screenshots) at desktop, tablet, and mobile widths. Verify that table containers scroll horizontally on narrow screens, focus rings are visible, buttons are keyboard reachable, long notes wrap, route navigation does not lose valid state, a reload does not restore stale state, and error messages preserve source values. Render [the live PDF](evidence/live-smoke-report.pdf) with a PDF viewer or Poppler and confirm pagination, headers, footers, Unicode units, all points, full-precision values, evidence links, provenance, acknowledgement, and disclaimer.
