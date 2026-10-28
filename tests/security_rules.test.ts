import { describe, it, expect } from 'vitest';
import { defaultLinter } from '../src/security/linter';

describe('Static Security Rules & OWASP Audit', () => {
  it('detects SQL injection vulnerabilities in template literals', () => {
    const vulnerableCode = `
import { db } from './db';

export async function getUser(req, res) {
  const userId = req.query.id;
  const result = await db.query(\`SELECT * FROM users WHERE id = \${userId}\`);
  res.json(result);
}
`;

    const findings = defaultLinter.scanContent('src/user.ts', vulnerableCode);
    const sqlFinding = findings.find(f => f.ruleId === 'sql-injection');

    expect(sqlFinding).toBeDefined();
    expect(sqlFinding?.severity).toBe('critical');
    expect(sqlFinding?.cwe).toBe('CWE-89');
    expect(sqlFinding?.line).toBe(6);
  });

  it('detects hardcoded secrets and API keys', () => {
    const leakCode = `
export const CONFIG = {
  githubToken: "ghp_1111222233334444555566667777888899990000",
  awsKey: "AKIAIOSFODNN7EXAMPLE"
};
`;

    const findings = defaultLinter.scanContent('src/config.ts', leakCode);
    const tokenFinding = findings.find(f => f.snippet?.includes('ghp_'));
    const awsFinding = findings.find(f => f.snippet?.includes('AKIA'));

    expect(tokenFinding).toBeDefined();
    expect(tokenFinding?.cwe).toBe('CWE-798');
    expect(awsFinding).toBeDefined();
  });

  it('detects Path Traversal vulnerabilities in filesystem calls', () => {
    const traversalCode = `
import fs from 'fs';
import path from 'path';

export function serveFile(req, res) {
  const filePath = path.join('/var/www/uploads', req.query.filename);
  const data = fs.readFileSync(filePath);
  res.send(data);
}
`;

    const findings = defaultLinter.scanContent('src/server.ts', traversalCode);
    const traversalFinding = findings.find(f => f.ruleId === 'path-traversal');

    expect(traversalFinding).toBeDefined();
    expect(traversalFinding?.severity).toBe('high');
    expect(traversalFinding?.cwe).toBe('CWE-22');
  });

  it('detects Command Injection via child_process.exec', () => {
    const cmdCode = `
import { exec } from 'child_process';

export function runBackup(filename: string) {
  exec(\`tar -czf backup.tar.gz \${filename}\`);
}
`;

    const findings = defaultLinter.scanContent('src/backup.ts', cmdCode);
    const cmdFinding = findings.find(f => f.ruleId === 'command-injection');

    expect(cmdFinding).toBeDefined();
    expect(cmdFinding?.cwe).toBe('CWE-78');
  });

  it('calculates security scorecard metrics correctly', () => {
    const cleanCode = `
export function add(a: number, b: number): number {
  return a + b;
}
`;

    const cleanFindings = defaultLinter.scanContent('src/math.ts', cleanCode);
    const scorecard = defaultLinter.buildScorecard(cleanFindings);

    expect(scorecard.totalFindings).toBe(0);
    expect(scorecard.riskScore).toBe(100);
    expect(scorecard.passed).toBe(true);
  });
});
