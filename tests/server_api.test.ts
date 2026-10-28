import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildServer } from '../src/server/api';
import { FastifyInstance } from 'fastify';

describe('Fastify REST API & Webhook Suite', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns system and provider health status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/health'
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.status).toBe('ok');
    expect(json.service).toBe('ReviewForge');
    expect(json.providerStatus).toBeDefined();
  });

  it('POST /api/review/diff audits unified diff and returns complete report', async () => {
    const rawDiff = `diff --git a/src/auth.ts b/src/auth.ts
new file mode 100644
--- /dev/null
+++ b/src/auth.ts
@@ -0,0 +1,6 @@
+import { db } from './db';
+export async function findUser(id: string) {
+  const q = \`SELECT * FROM users WHERE id = \${id}\`;
+  return db.query(q);
+}
+`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/review/diff',
      payload: {
        diff: rawDiff,
        generateTests: true
      }
    });

    expect(res.statusCode).toBe(200);
    const result = JSON.parse(res.body);
    expect(result.id).toBeDefined();
    expect(result.scorecard.findings).toHaveLength(1);
    expect(result.scorecard.findings[0].ruleId).toBe('sql-injection');
    expect(result.synthesizedTests).toHaveLength(1);
    expect(result.synthesizedTests[0].code).toContain('findUser');

    // Verify GET /api/reviews lists this review
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/reviews'
    });
    expect(listRes.statusCode).toBe(200);
    const listJson = JSON.parse(listRes.body);
    expect(listJson.reviews.some((r: any) => r.id === result.id)).toBe(true);

    // Verify GET /api/reviews/:id/sarif returns SARIF 2.1.0
    const sarifRes = await app.inject({
      method: 'GET',
      url: `/api/reviews/${result.id}/sarif`
    });
    expect(sarifRes.statusCode).toBe(200);
    const sarifJson = JSON.parse(sarifRes.body);
    expect(sarifJson.version).toBe('2.1.0');
    expect(sarifJson.runs[0].results[0].ruleId).toBe('sql-injection');
  });

  it('POST /api/webhook/github responds to ping event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/webhook/github',
      headers: {
        'x-github-event': 'ping'
      },
      payload: {
        zen: 'Design for failure.'
      }
    });

    expect(res.statusCode).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.message).toBe('PONG');
  });
});
