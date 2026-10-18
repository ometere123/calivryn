import { describe, expect, it, vi } from 'vitest';
import handler from '../worker/index';
import type { Env } from '../worker/index';
import { MODEL_ID } from '../shared/calibration';
import { exampleMetadata, examplePoints } from '../src/lib/sample';
const fixture = { metadata: exampleMetadata, points: examplePoints };
function env(options: { rateAllowed?: boolean; modelText?: string; rejectAi?: boolean } = {}): Env {
  return {
    AI: { run: vi.fn().mockImplementation(async () => {
      if (options.rejectAi) throw new Error('Provider secret internal error');
      return { response: options.modelText ?? JSON.stringify({
        summary: 'Synthetic readings suggest that the reported adjustment should be reviewed by the technician.',
        observations: [{ pointIds: ['P00'], text: 'As-found data warrants an explicit technician check of the zero point.' }],
        reviewItems: [{ pointIds: ['P25'], action: 'Verify source and reference tolerance before sharing.' }],
      }) };
    }) },
    AI_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: options.rateAllowed !== false }) },
    GLOBAL_AI_BUDGET: { limit: vi.fn().mockResolvedValue({ success: true }) },
  };
}
const post = (body: unknown, headers: Record<string, string> = {}) => new Request('https://calivryn.example/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('Worker API', () => {
  it('reports health without alleging inference has been tested', async () => {
    const res = await handler.fetch(new Request('https://calivryn.example/api/health'), env());
    expect((await res.json() as { model: string }).model).toBe(MODEL_ID);
  });
  it('performs a real AI binding call after authoritative calculations', async () => {
    const binding = env();
    const res = await handler.fetch(post(fixture), binding);
    expect(res.status).toBe(200);
    const data = await res.json() as { calculation: { rows: { point_id: string; as_found_error: string }[] }; narrative: { observations: { pointIds: string[] }[] } };
    expect(data.calculation.rows[0]).toMatchObject({ point_id: 'P00', as_found_error: '0.11' });
    expect(data.narrative.observations[0].pointIds).toContain('P00');
    expect(binding.AI.run).toHaveBeenCalledTimes(1);
  });
  it('rejects unauthorized origin and does not invoke AI', async () => {
    const binding = env();
    const res = await handler.fetch(post(fixture, { Origin: 'https://hostile.example' }), binding);
    expect(res.status).toBe(403);
    expect(binding.AI.run).not.toHaveBeenCalled();
  });
  it('rejects tampered readings before inference', async () => {
    const binding = env();
    const changed = structuredClone(fixture);
    changed.points[0].as_found = 'Infinity';
    const res = await handler.fetch(post(changed), binding);
    expect(res.status).toBe(422);
    expect(binding.AI.run).not.toHaveBeenCalled();
  });
  it('enforces body length cap', async () => {
    const res = await handler.fetch(post('x'.repeat(46_000)), env());
    expect(res.status).toBe(413);
  });
  it('rate limits without using AI', async () => {
    const binding = env({ rateAllowed: false });
    const res = await handler.fetch(post(fixture), binding);
    expect(res.status).toBe(429);
    expect(binding.AI.run).not.toHaveBeenCalled();
  });
  it('does not silently fabricate a narrative when AI fails', async () => {
    const res = await handler.fetch(post(fixture), env({ rejectAi: true }));
    expect(res.status).toBe(503);
    expect(await res.text()).not.toContain('Provider secret internal error');
  });
  it('rejects hallucinated point IDs', async () => {
    const res = await handler.fetch(post(fixture), env({ modelText: JSON.stringify({
      summary: 'Check readings.', observations: [{ pointIds: ['P999'], text: 'Never observed.' }],
      reviewItems: [{ pointIds: ['P25'], action: 'Follow up.' }],
    }) }));
    expect(res.status).toBe(502);
  });
});
