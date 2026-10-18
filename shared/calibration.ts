/** Deterministic, versioned service-report math. Never use an LLM for pass/fail. */
import Decimal from 'decimal.js';
import { z } from 'zod';

// Guarantee exact decimal comparisons for supported 12+8 digit input bounds.
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP, toExpNeg: -45, toExpPos: 45 });

export const MAX_POINTS = 40;
export const MAX_CSV_BYTES = 30_000;
export const MODEL_ID = '@cf/google/gemma-4-26b-a4b-it' as const;
export const REQUIRED_CSV_HEADERS = ['point_id', 'reference', 'as_found', 'as_left', 'tolerance'] as const;

const boundedText = (max: number) => z.string().trim().min(1).max(max);
const decimalText = z.string().trim().regex(/^[+-]?(?:\d{1,12}(?:\.\d{1,8})?|\.\d{1,8})$/, 'Use a finite plain decimal (up to 12 integer and 8 fractional digits)')
  .refine(value => { try { return new Decimal(value).isFinite(); } catch { return false; } }, 'Invalid decimal');
const pointId = z.string().trim().regex(/^[A-Za-z][A-Za-z0-9_-]{0,19}$/, 'Point ID: 1–20 letters, digits, underscore or hyphen; start with a letter');
const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a real calendar date');

export const metadataSchema = z.object({
  client: boundedText(90),
  project: boundedText(90),
  instrumentId: boundedText(60),
  instrumentType: boundedText(80),
  technician: boundedText(80),
  date: dateText,
  unit: z.string().trim().min(1).max(18).regex(/^[\p{L}\p{N}°%µμΩ\/\-_. ]+$/u, 'Use a short engineering unit'),
  notes: z.string().max(2000),
}).strict();

export const pointSchema = z.object({
  point_id: pointId,
  reference: decimalText,
  as_found: decimalText,
  as_left: decimalText,
  tolerance: decimalText.refine(value => {
    try { return new Decimal(value).greaterThan(0); }
    catch { return false; }
  }, 'Absolute tolerance must be greater than zero'),
}).strict();

export const reportInputSchema = z.object({
  metadata: metadataSchema,
  points: z.array(pointSchema).min(1).max(MAX_POINTS),
}).strict().superRefine((report, context) => {
  const ids = new Set<string>();
  report.points.forEach((point, index) => {
    const normal = point.point_id.toLowerCase();
    if (ids.has(normal)) context.addIssue({ code: 'custom', path: ['points', index, 'point_id'], message: 'Duplicate point ID' });
    ids.add(normal);
  });
});

export type Metadata = z.infer<typeof metadataSchema>;
export type PointInput = z.infer<typeof pointSchema>;
export type ReportInput = z.infer<typeof reportInputSchema>;
export type PointResult = PointInput & {
  as_found_error: string;
  as_left_error: string;
  as_found_absolute_error: string;
  as_left_absolute_error: string;
  as_found_pass: boolean;
  as_left_pass: boolean;
  change: 'improved' | 'unchanged' | 'deteriorated';
};
export type Calculation = {
  rows: PointResult[];
  count: number;
  as_found_passed: number;
  as_left_passed: number;
  as_found_overall: 'WITHIN' | 'OUTSIDE';
  as_left_overall: 'WITHIN' | 'OUTSIDE';
  improved: number;
  unchanged: number;
  deteriorated: number;
  assessment_basis: 'USER_SUPPLIED_ABSOLUTE_TOLERANCE';
};

export function calculateReport(input: ReportInput): Calculation {
  const report = reportInputSchema.parse(input);
  const rows: PointResult[] = report.points.map(point => {
    const reference = new Decimal(point.reference);
    const found = new Decimal(point.as_found).minus(reference);
    const left = new Decimal(point.as_left).minus(reference);
    const tolerance = new Decimal(point.tolerance);
    const foundAbs = found.abs();
    const leftAbs = left.abs();
    return {
      ...point,
      as_found_error: found.toString(),
      as_left_error: left.toString(),
      as_found_absolute_error: foundAbs.toString(),
      as_left_absolute_error: leftAbs.toString(),
      as_found_pass: foundAbs.lte(tolerance),
      as_left_pass: leftAbs.lte(tolerance),
      change: leftAbs.lt(foundAbs) ? 'improved' : leftAbs.eq(foundAbs) ? 'unchanged' : 'deteriorated',
    };
  });
  const foundPass = rows.filter(row => row.as_found_pass).length;
  const leftPass = rows.filter(row => row.as_left_pass).length;
  return {
    rows,
    count: rows.length,
    as_found_passed: foundPass,
    as_left_passed: leftPass,
    as_found_overall: foundPass === rows.length ? 'WITHIN' : 'OUTSIDE',
    as_left_overall: leftPass === rows.length ? 'WITHIN' : 'OUTSIDE',
    improved: rows.filter(row => row.change === 'improved').length,
    unchanged: rows.filter(row => row.change === 'unchanged').length,
    deteriorated: rows.filter(row => row.change === 'deteriorated').length,
    assessment_basis: 'USER_SUPPLIED_ABSOLUTE_TOLERANCE',
  };
}

export const observationSchema = z.object({
  pointIds: z.array(pointId).min(1).max(5),
  text: boundedText(500),
}).strict();
export const reviewItemSchema = z.object({
  pointIds: z.array(pointId).min(1).max(5),
  action: boundedText(350),
}).strict();
export const narrativeSchema = z.object({
  summary: boundedText(900),
  observations: z.array(observationSchema).min(1).max(5),
  reviewItems: z.array(reviewItemSchema).min(1).max(5),
}).strict();
export type Narrative = z.infer<typeof narrativeSchema>;

export function validateNarrative(value: unknown, points: PointResult[]): Narrative {
  const parsed = narrativeSchema.parse(value);
  const validIds = new Set(points.map(point => point.point_id));
  for (const item of [...parsed.observations, ...parsed.reviewItems]) {
    if (item.pointIds.some(id => !validIds.has(id))) throw new Error('AI cited a measurement point that does not exist');
  }
  return parsed;
}

export type Analysis = {
  model: typeof MODEL_ID;
  calculation: Calculation;
  narrative: Narrative;
  generatedAt: string;
};

/** Don't promote user-provided acceptance thresholds into claims of accredited conformance. */
export const DISCLAIMER =
  'SERVICE REPORT PREPARATION ONLY. Results are comparisons against technician-supplied absolute tolerances, not accredited calibration, compliance certification, measurement uncertainty analysis, or a safety-to-operate decision. Verify instrument traceability, units, methods and acceptance criteria independently. A qualified technician must review and approve the content.';
