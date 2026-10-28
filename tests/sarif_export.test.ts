import { describe, it, expect } from 'vitest';
import { generateSarifReport } from '../src/export/sarif';
import { SecurityFinding } from '../src/security/types';

describe('SARIF 2.1.0 Export', () => {
  it('generates compliant SARIF report from security findings', () => {
    const findings: SecurityFinding[] = [
      {
        ruleId: 'sql-injection',
        title: 'SQL Injection Vulnerability',
        description: 'Unparameterized query execution detected.',
        severity: 'critical',
        cwe: 'CWE-89',
        filePath: 'src/users.ts',
        line: 42,
        column: 10,
        remediation: 'Use parameterized statements.'
      },
      {
        ruleId: 'path-traversal',
        title: 'Path Traversal Vulnerability',
        description: 'Unsanitized user path passed to fs API.',
        severity: 'high',
        cwe: 'CWE-22',
        filePath: 'src/files.ts',
        line: 15,
        remediation: 'Sanitize with path.basename.'
      }
    ];

    const sarif = generateSarifReport(findings);

    expect(sarif.version).toBe('2.1.0');
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe('ReviewForge');
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(2);
    expect(sarif.runs[0].results).toHaveLength(2);

    const firstResult = sarif.runs[0].results[0];
    expect(firstResult.ruleId).toBe('sql-injection');
    expect(firstResult.level).toBe('error');
    expect(firstResult.locations[0].physicalLocation.artifactLocation.uri).toBe('src/users.ts');
    expect(firstResult.locations[0].physicalLocation.region.startLine).toBe(42);
  });
});
