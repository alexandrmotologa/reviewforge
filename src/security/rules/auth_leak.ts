import { SecurityRule, SecurityFinding } from '../types';

/**
 * Detects hardcoded secrets, API tokens, private keys, and unsecured endpoints.
 */
export const authLeakRule: SecurityRule = {
  id: 'auth-leak',
  title: 'Hardcoded Secret or Token Leak',
  cwe: 'CWE-798',
  defaultSeverity: 'critical',

  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split(/\r?\n/);

    const secretPatterns = [
      {
        regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}/,
        name: 'GitHub Personal Access Token'
      },
      {
        regex: /AKIA[0-9A-Z]{16}/,
        name: 'AWS Access Key ID'
      },
      {
        regex: /xox[baprs]-[0-9a-zA-Z]{10,48}/,
        name: 'Slack API Token'
      },
      {
        regex: /(?:sk|rk)_live_[0-9a-zA-Z]{24,99}/,
        name: 'Stripe Live Secret Key'
      },
      {
        regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
        name: 'Unencrypted Private Key'
      },
      {
        regex: /(?:api[_-]?key|secret[_-]?token|auth[_-]?token|access[_-]?token|jwt[_-]?secret)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{24,}['"]/i,
        name: 'Hardcoded API Key or Secret'
      }
    ];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
        continue;
      }

      const line = lines[i];

      // Exclude placeholder and test dummy values
      if (
        line.includes('your_') ||
        line.includes('example_') ||
        line.includes('process.env') ||
        line.includes('os.environ') ||
        line.includes('test-key') ||
        line.includes('dummy')
      ) {
        continue;
      }

      for (const sp of secretPatterns) {
        const match = line.match(sp.regex);
        if (match) {
          findings.push({
            ruleId: this.id,
            title: `Hardcoded Secret (${sp.name})`,
            description: `Detected committed ${sp.name}. Hardcoding credentials in source code exposes production infrastructure to unauthorized access.`,
            severity: this.defaultSeverity,
            cwe: this.cwe,
            filePath,
            line: lineNo,
            snippet: line.trim(),
            remediation: 'Remove the secret immediately, revoke it in your provider dashboard, and reference it via process.env.',
            suggestionCode: line.replace(/['"][a-zA-Z0-9_\-\.]{24,}['"]/, "process.env.SECRET_KEY || ''")
          });
          break;
        }
      }
    }

    return findings;
  }
};
