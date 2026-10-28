import { SecurityRule, SecurityFinding } from '../types';

/**
 * Detects insecure CORS configurations such as wildcard origin combined with credentials.
 */
export const corsCsrfRule: SecurityRule = {
  id: 'cors-csrf',
  title: 'Insecure CORS Policy',
  cwe: 'CWE-942',
  defaultSeverity: 'medium',

  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
        continue;
      }

      const line = lines[i];

      if (
        (line.includes("origin: '*'") || line.includes('origin: "*"') || line.includes("Access-Control-Allow-Origin', '*'")) &&
        (content.includes('credentials: true') || content.includes('Access-Control-Allow-Credentials'))
      ) {
        findings.push({
          ruleId: this.id,
          title: this.title,
          description: 'CORS wildcard origin configured with credentials enabled. This configuration allows third-party origins to execute authenticated cross-site requests.',
          severity: this.defaultSeverity,
          cwe: this.cwe,
          filePath,
          line: lineNo,
          snippet: line.trim(),
          remediation: 'Specify explicit trusted origins in the CORS configuration rather than a wildcard when credentials are required.'
        });
        break;
      }
    }

    return findings;
  }
};
