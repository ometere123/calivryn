import { MODEL_ID, validateNarrative, type Analysis, type PointResult, type ReportInput } from '../../shared/calibration';

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); }
}
export async function analyzeReport(input: ReportInput, signal?: AbortSignal): Promise<Analysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal,
  });
  let data: unknown;
  try { data = await response.json(); } catch { throw new ApiError('The server returned an unreadable response', response.status, 'INVALID_RESPONSE'); }
  if (!response.ok) {
    const err = (data as { error?: { message?: string; code?: string } })?.error;
    throw new ApiError(err?.message || 'Could not analyse this report', response.status, err?.code || 'REQUEST_FAILED');
  }
  const candidate = data as Partial<Analysis> & { calculation?: { rows?: unknown } };
  if (candidate.model !== MODEL_ID || !candidate.calculation || !Array.isArray(candidate.calculation.rows) || !candidate.narrative || !candidate.generatedAt) {
    throw new ApiError('The server response is incomplete', 502, 'INVALID_RESPONSE');
  }
  try {
    validateNarrative(candidate.narrative, candidate.calculation.rows as PointResult[]);
  } catch {
    throw new ApiError('The server returned malformed or ungrounded analysis', 502, 'INVALID_RESPONSE');
  }
  return candidate as Analysis;
}
