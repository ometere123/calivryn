import { describe, expect, it } from 'vitest';
import { calculateReport, reportInputSchema, validateNarrative, type ReportInput } from '../shared/calibration';

const input: ReportInput = {
  metadata: {
    client: 'Synthetic Co', project: 'Test', instrumentId: 'PT-01', instrumentType: 'Pressure sensor',
    technician: 'Operator', date: '2026-10-18', unit: 'bar', notes: 'Synthetic example only',
  },
  points: [
    { point_id: 'A', reference: '5.0', as_found: '5.1', as_left: '5.05', tolerance: '0.05' },
    { point_id: 'B', reference: '0.1', as_found: '0.3', as_left: '0.2', tolerance: '0.1' },
  ],
};
describe('deterministic calibration', () => {
  it('compares exact decimal boundaries and signed errors', () => {
    const result = calculateReport(input);
    expect(result.rows[0]).toMatchObject({ as_found_error: '0.1', as_left_error: '0.05', as_found_pass: false, as_left_pass: true, change: 'improved' });
    expect(result.rows[1]).toMatchObject({ as_found_error: '0.2', as_left_error: '0.1', as_found_pass: false, as_left_pass: true });
    expect(result.as_found_overall).toBe('OUTSIDE');
    expect(result.as_left_overall).toBe('WITHIN');
    expect(result.improved).toBe(2);
  });
  it('does not round floats into a pass', () => {
    const changed = structuredClone(input);
    changed.points[0].as_left = '5.05000001';
    expect(calculateReport(changed).rows[0].as_left_pass).toBe(false);
  });
  it('supports negative references and reports deterioration', () => {
    const changed = structuredClone(input);
    changed.points = [{ point_id: 'NEG', reference: '-100', as_found: '-100', as_left: '-100.5', tolerance: '0.1' }];
    expect(calculateReport(changed).rows[0]).toMatchObject({ as_left_error: '-0.5', change: 'deteriorated', as_left_pass: false });
  });
  it('rejects zero tolerance and missing numeric data', () => {
    for (const value of ['', '0', '-0.5', 'NaN', 'Infinity', '1e20']) {
      const changed = structuredClone(input);
      changed.points[0].tolerance = value;
      expect(reportInputSchema.safeParse(changed).success).toBe(false);
    }
  });
  it('rejects duplicate case-insensitive point IDs', () => {
    const changed = structuredClone(input);
    changed.points[1].point_id = 'a';
    expect(reportInputSchema.safeParse(changed).success).toBe(false);
  });
  it('rejects invalid dates and oversized notes', () => {
    const changed = structuredClone(input);
    changed.metadata.date = '2026-02-30';
    expect(reportInputSchema.safeParse(changed).success).toBe(false);
    changed.metadata.date = '2026-10-18';
    changed.metadata.notes = 'a'.repeat(2001);
    expect(reportInputSchema.safeParse(changed).success).toBe(false);
  });
  it('accepts supported negative, tiny and Unicode engineering-unit values', () => {
    const changed = structuredClone(input);
    changed.metadata.unit = 'mΩ/°C·s⁻¹';
    changed.points = [{ point_id: 'TINY', reference: '-0.00000001', as_found: '-0.00000000', as_left: '-0.00000001', tolerance: '0.00000001' }];
    expect(reportInputSchema.safeParse(changed).success).toBe(true);
    expect(calculateReport(changed).rows[0]).toMatchObject({ as_found_error: '0.00000001', as_left_error: '0', as_left_pass: true });
  });
  it('rejects scientific notation, non-finite values, unexpected properties and oversized units', () => {
    const changed = structuredClone(input) as ReportInput & { extra?: string };
    changed.extra = 'unexpected';
    expect(reportInputSchema.safeParse(changed).success).toBe(false);
    for (const value of ['1e-8', 'NaN', 'Infinity', '-Infinity']) {
      const invalid = structuredClone(input);
      invalid.points[0].as_found = value;
      expect(reportInputSchema.safeParse(invalid).success).toBe(false);
    }
    const invalidUnit = structuredClone(input);
    invalidUnit.metadata.unit = 'u'.repeat(49);
    expect(reportInputSchema.safeParse(invalidUnit).success).toBe(false);
  });
  it('rejects phantom point citations and schema-incomplete narratives', () => {
    const calc = calculateReport(input);
    const narrative = { summary: 'Human review required.', observations: [{ pointIds: ['GHOST'], text: 'Invalid citation' }], reviewItems: [{ pointIds: ['A'], action: 'Confirm reference source' }] };
    expect(() => validateNarrative(narrative, calc.rows)).toThrow();
    expect(() => validateNarrative({ ...narrative, observations: [] }, calc.rows)).toThrow();
  });
});
