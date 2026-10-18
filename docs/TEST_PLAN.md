# Calivryn test plan and evidence

## Automated suites

| Suite | Command | Current result | Coverage |
|---|---|---:|---|
| TypeScript | `npm run typecheck` | PASS | App, Worker and shared contracts |
| Unit/Worker/PDF/CSV | `npm run test` | 29 passed | Math, input, Worker failures, AI response validation, review/export invariants |
| Browser | `npm run test:e2e` | 3 passed | Sample import, unavailable model recovery, technician review and browser PDF download |
| Production build | `npm run build` | PASS | Cloudflare Vite Worker and Static Assets build |
| Runtime audit | `npm audit --omit=dev` | 0 vulnerabilities | Production dependency tree |
| Full audit | `npm audit` | 0 vulnerabilities | Runtime and development dependency tree |

The browser suite uses an intercepted API response by design. It is credential-free and must not be described as live model evidence.

## Functional and adversarial matrix

| Check | Expected result | Evidence |
|---|---|---|
| Synthetic sample import | Five labelled synthetic points load | Playwright test and screenshots |
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
| Wrong content type | `415`, no AI call | `tests/worker.test.ts`, live smoke evidence |
| Oversized request | `413`, no AI call | `tests/worker.test.ts` |
| Hostile Origin | `403`, no AI call | `tests/worker.test.ts`, live smoke evidence |
| Personal/global throttle | `429`, no AI call | `tests/worker.test.ts` |
| Prompt injection in notes | Notes remain untrusted; authoritative math unchanged | `tests/worker.test.ts` |
| Malformed/phantom model output | `502`, no fabricated narrative | `tests/worker.test.ts`, `tests/calibration.test.ts` |
| Provider exception | Safe `503`, provider details absent | `tests/worker.test.ts` |
| Changed data after analysis | Prior result/approval invalidated; export refused | React flow and `tests/pdf.test.ts` |
| Approval absent | Export refused | `tests/pdf.test.ts`, Playwright |
| Long Unicode unit/notes | PDF wraps and remains multi-page | `tests/pdf.test.ts` |
| 40-point PDF | More than one page with all rows | `tests/pdf.test.ts` |

## Live smoke evidence

The dated live evidence under [`docs/evidence/live-smoke.json`](evidence/live-smoke.json) was collected against `https://calivryn.delealufejoel.workers.dev` using the actual public deployment and synthetic data. It records:

- health response and exact model ID;
- one actual browser-generated Gemma narrative with point references;
- Worker-authoritative `OUTSIDE` as-found and `WITHIN` as-left results;
- technician acknowledgement and downloaded PDF filename/size;
- hostile-origin and wrong-content-type failures;
- a safe sequence of additional requests to observe the edge throttle.

The sequence did not produce a `429` in that run, so no stronger live claim is made about counter propagation. The binding's `429` behavior is directly tested with deterministic Worker bindings. A real provider outage was not induced; the safe throwing-binding test covers recovery behavior.

## Manual acceptance

Inspect desktop, tablet-width, and mobile-width captures under `docs/screenshots/`. Verify that table containers can scroll horizontally on narrow screens, focus rings are visible, buttons are keyboard reachable, error messages preserve source values, long notes wrap, and the browser PDF is opened/rendered with `pdftoppm` or a PDF viewer. The checked live PDF has two pages, all five synthetic points, full signed errors, evidence-linked observations, review actions, provenance, and the non-accreditation disclaimer.
