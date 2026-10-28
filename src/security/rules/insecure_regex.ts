import { SecurityRule, SecurityFinding } from '../types';

/**
 * Detects catastrophic backtracking regular expressions (ReDoS).
 */
export const insecureRegexRule: SecurityRule = {
  id: 'insecure-regex',
  title: 'Catastrophic Backtracking Regular Expression (ReDoS)',
  cwe: 'CWE-1333',
  defaultSeverity: 'medium',

  scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = content.split(/\r?\n/);

    // Overlapping quantifiers like (a+)+, ([a-zA-Z]+)*, (x+){2,}
    const redosPatterns = [
      /\(\s*\[?[a-zA-Z0-9_\-\.\s]+\]?\s*[\+\*]\s*\)\s*[\+\*]/,
      /\(\s*\\w\+\s*\)\s*[\+\*]/,
      /\(\s*\\d\+\s*\)\s*[\+\*]/,
      /\(\s*\.\+\s*\)\s*[\+\*]/
    ];

    for (let i = 0; i < lines.length; i++) {
      const lineNo = i + 1;
      if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
        continue;
      }

      const line = lines[i];
      const trimmed = line.trim();

      // Skip comment lines
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('#')) {
        continue;
      }

      for (const pattern of redosPatterns) {
        if (pattern.test(line)) {
          findings.push({
            ruleId: this.id,
            title: this.title,
            description: 'Nested quantifier detected in regular expression. An attacker can provide crafted input that triggers exponential backtracking, freezing the event loop.',
            severity: this.defaultSeverity,
            cwe: this.cwe,
            filePath,
            line: lineNo,
            snippet: line.trim(),
            remediation: 'Refactor the regular expression to eliminate nested repetitions or use atomic groupings / possessive quantifiers.'
          });
          break;
        }
      }
    }

    return findings;
  }
};
