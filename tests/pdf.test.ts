import { describe, expect, it } from 'vitest';
import { calculateReport, MODEL_ID, type Analysis, type ReportInput } from '../shared/calibration';
import { createReportPdf } from '../src/lib/pdf';
import { exampleMetadata, examplePoints } from '../src/lib/sample';
const source: ReportInput = { metadata: exampleMetadata, points: examplePoints };
const report: Analysis = {
  model: MODEL_ID,
  generatedAt: '2026-10-18T16:00:00.000Z',
  calculation: calculateReport(source),
  narrative: {
    summary: 'Synthetic demonstration. The technician must verify the as-left measurements.',
    observations: [{ pointIds: ['P00'], text: 'The zero point warrants further review.' }],
    reviewItems: [{ pointIds: ['P25'], action: 'Recheck reference traceability.' }],
  },
};
describe('PDF safety and rendering', () => {
  it('refuses export without technician acknowledgement', () => {
    expect(() => createReportPdf(source, report, report.narrative, false)).toThrow(/acknowledgement/i);
  });
  it('refuses export when measurements change after inference', () => {
    const changed = structuredClone(source);
    changed.points[0].as_found = '0.5';
    expect(() => createReportPdf(changed, report, report.narrative, true)).toThrow(/changed after analysis/i);
  });
  it('produces actual PDF bytes with multiple measurement pages', () => {
    const dense: ReportInput = {
      ...source,
      points: Array.from({ length: 40 }, (_, index) => ({
        point_id: `P${index + 1}`, reference: `${index}`, as_found: `${index}.10000001`, as_left: `${index}.01000001`, tolerance: '0.2',
      })),
    };
    const data: Analysis = { ...report, calculation: calculateReport(dense), narrative: { ...report.narrative, observations: [{ pointIds: ['P1'], text: 'Check synthetic data.' }] } };
    const bytes = createReportPdf(dense, data, data.narrative, true);
    expect(bytes.getNumberOfPages()).toBeGreaterThan(1);
    expect(bytes.output('arraybuffer').byteLength).toBeGreaterThan(4000);
  });
});
