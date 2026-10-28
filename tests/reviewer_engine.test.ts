import { describe, it, expect } from 'vitest';
import { ReviewForgeEngine } from '../src/engine/reviewer';
import { LLMProvider } from '../src/engine/llm_provider';

describe('ReviewForge Core Orchestration Engine', () => {
  it('runs full review on diff with vulnerabilities and generates synthesized tests', async () => {
    const rawDiff = `diff --git a/src/api/auth.ts b/src/api/auth.ts
new file mode 100644
--- /dev/null
+++ b/src/api/auth.ts
@@ -0,0 +1,9 @@
+import { db } from '../db';
+
+export async function loginUser(email: string, pass: string): Promise<any> {
+  const query = \`SELECT * FROM users WHERE email = '\${email}' AND password = '\${pass}'\`;
+  const user = await db.query(query);
+  return user;
+}
+`;

    const engine = new ReviewForgeEngine(undefined, new LLMProvider({ provider: 'offline' }));
    const result = await engine.reviewDiff(rawDiff);

    expect(result.id).toBeDefined();
    expect(result.fileDiffs).toHaveLength(1);
    expect(result.scorecard.passed).toBe(false);
    expect(result.scorecard.criticalCount).toBeGreaterThanOrEqual(1);

    const sqlFinding = result.scorecard.findings.find(f => f.ruleId === 'sql-injection');
    expect(sqlFinding).toBeDefined();
    expect(sqlFinding?.cwe).toBe('CWE-89');

    // Synthesized tests check
    expect(result.synthesizedTests).toHaveLength(1);
    const testFile = result.synthesizedTests[0];
    expect(testFile.testFilePath).toContain('auth.test.ts');
    expect(testFile.code).toContain("describe('loginUser'");
    expect(testFile.code).toContain('loginUser');

    // Markdown report check
    expect(result.markdownReport).toContain('ReviewForge Code Review Report');
    expect(result.markdownReport).toContain('SQL Injection Vulnerability');
  });

  it('runs review on clean code with high risk score', async () => {
    const rawDiff = `diff --git a/src/math.ts b/src/math.ts
--- a/src/math.ts
+++ b/src/math.ts
@@ -1,3 +1,3 @@
 export function multiply(a: number, b: number): number {
-  return 0;
+  return a * b;
 }
`;

    const engine = new ReviewForgeEngine(undefined, new LLMProvider({ provider: 'offline' }));
    const result = await engine.reviewDiff(rawDiff);

    expect(result.scorecard.passed).toBe(true);
    expect(result.scorecard.criticalCount).toBe(0);
    expect(result.scorecard.riskScore).toBe(100);
  });
});
