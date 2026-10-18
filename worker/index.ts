import { calculateReport, MODEL_ID, reportInputSchema } from '../shared/calibration';
import { generateNarrative, ModelError, type AiBinding } from './model';

interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}
export interface Env {
  AI: AiBinding;
  AI_RATE_LIMITER: RateLimitBinding;
  GLOBAL_AI_BUDGET: RateLimitBinding;
}

const HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};
const BODY_LIMIT = 45_000;
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}
function error(code: string, message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}
async function readLimited(request: Request, limit: number): Promise<string> {
  if (Number(request.headers.get('content-length') || 0) > limit) throw new Error('TOO_LARGE');
  if (!request.body) return '';
  const reader = request.body.getReader();
  const buffers: Uint8Array[] = [];
  let count = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    count += value.byteLength;
    if (count > limit) { await reader.cancel(); throw new Error('TOO_LARGE'); }
    buffers.push(value);
  }
  const bytes = new Uint8Array(count);
  let offset = 0;
  for (const buffer of buffers) { bytes.set(buffer, offset); offset += buffer.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, model: MODEL_ID, inference: 'LIVE_BINDING_REQUIRED', storage: false });
    }
    if (url.pathname !== '/api/analyze') return error('NOT_FOUND', 'API endpoint not found', 404);
    if (request.method !== 'POST') return error('METHOD_NOT_ALLOWED', 'Use POST for analysis', 405);
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return error('FORBIDDEN_ORIGIN', 'Only same-origin submissions are accepted', 403);
    const contentType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase();
    if (contentType !== 'application/json') {
      return error('CONTENT_TYPE', 'Content-Type must be application/json', 415);
    }
    let body: unknown;
    try {
      body = JSON.parse(await readLimited(request, BODY_LIMIT));
    } catch (cause) {
      return cause instanceof Error && cause.message === 'TOO_LARGE'
        ? error('REQUEST_TOO_LARGE', 'Maximum request size is 45 KB', 413)
        : error('BAD_JSON', 'Invalid UTF-8 JSON request', 400);
    }
    const validated = reportInputSchema.safeParse(body);
    if (!validated.success) {
      return error('INVALID_REPORT', `Check calibration input: ${validated.error.issues[0]?.path.join('.') || 'report'} — ${validated.error.issues[0]?.message || 'invalid value'}`, 422);
    }
    // Numeric assessment happens twice: in the browser for preview and here for authority.
    const calculation = calculateReport(validated.data);
    try {
      if (!env.AI || !env.AI_RATE_LIMITER || !env.GLOBAL_AI_BUDGET) {
        return error('SERVICE_NOT_CONFIGURED', 'Cloudflare AI or rate-limit binding is not configured', 503);
      }
      // With no accounts/database, identity is necessarily approximate. Edge-local protection, not a global daily quota.
      const ip = (request.headers.get('CF-Connecting-IP') || 'local-or-unknown').slice(0, 128);
      const [personal, global] = await Promise.all([
        env.AI_RATE_LIMITER.limit({ key: `analyze:${ip}` }),
        env.GLOBAL_AI_BUDGET.limit({ key: 'shared-inference-budget' }),
      ]);
      if (!personal.success || !global.success) return error('RATE_LIMITED', 'Too many analysis requests. Please try again in one minute.', 429);
      const narrative = await generateNarrative(env.AI, validated.data.metadata, calculation);
      return json({ model: MODEL_ID, generatedAt: new Date().toISOString(), calculation, narrative });
    } catch (cause) {
      if (cause instanceof ModelError) {
        return error(cause.code, cause.message, cause.code === 'AI_PROVIDER_UNAVAILABLE' ? 503 : 502);
      }
      return error('ANALYSIS_UNAVAILABLE', 'Analysis could not be completed; no report was generated', 503);
    }
  },
};
