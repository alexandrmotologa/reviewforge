import { describe, it, expect } from 'vitest';
import { generateGitPatch } from '../src/export/patch';
import { SecurityFinding } from '../src/security/types';

describe('Git Unified Patch Exporter', () => {
  it('generates applicable unified diff patch from suggestions', () => {
    const originalFile = `import { db } from './db';

export async function getUser(id: string) {
  const q = \`SELECT * FROM users WHERE id = \${id}\`;
  return db.query(q);
}
`;

    const findings: SecurityFinding[] = [
      {
        ruleId: 'sql-injection',
        title: 'SQL Injection Vulnerability',
        description: 'Unparameterized query execution detected.',
        severity: 'critical',
        cwe: 'CWE-89',
        filePath: 'src/users.ts',
        line: 4,
        remediation: 'Use parameterized queries.',
        suggestionCode: "  const q = 'SELECT * FROM users WHERE id = $1';\n  return db.query(q, [id]);"
      }
    ];

    const fileMap = new Map<string, string>([
      ['src/users.ts', originalFile]
    ]);

    const patchResult = generateGitPatch(findings, fileMap);

    expect(patchResult.appliedCount).toBe(1);
    expect(patchResult.filesModified).toContain('src/users.ts');
    expect(patchResult.patchContent).toContain('diff --git a/src/users.ts b/src/users.ts');
    expect(patchResult.patchContent).toContain('--- a/src/users.ts');
    expect(patchResult.patchContent).toContain('+++ b/src/users.ts');
    expect(patchResult.patchContent).toContain("-  const q = `SELECT * FROM users WHERE id = ${id}`;");
    expect(patchResult.patchContent).toContain("+  const q = 'SELECT * FROM users WHERE id = $1';");
  });
});
