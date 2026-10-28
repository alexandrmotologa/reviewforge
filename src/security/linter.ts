import { SecurityFinding, SecurityRule, SecurityScorecard } from './types';
import { sqlInjectionRule } from './rules/sql_injection';
import { authLeakRule } from './rules/auth_leak';
import { traversalRule } from './rules/traversal';
import { commandInjectionRule } from './rules/command_injection';
import { insecureRegexRule } from './rules/insecure_regex';
import { ssrfRule } from './rules/ssrf';
import { corsCsrfRule } from './rules/cors_csrf';
import { FileDiff } from '../git/diff_parser';

export class SecurityLinter {
  private rules: SecurityRule[] = [
    sqlInjectionRule,
    authLeakRule,
    traversalRule,
    commandInjectionRule,
    insecureRegexRule,
    ssrfRule,
    corsCsrfRule
  ];

  /**
   * Registers an additional custom security rule.
   */
  public registerRule(rule: SecurityRule): void {
    this.rules.push(rule);
  }

  /**
   * Scans a single file string content against all registered rules.
   */
  public scanContent(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const seen = new Set<string>();

    // Skip scanning rule definitions themselves to prevent self-matching rule patterns
    if (filePath.includes('src/security/rules') || filePath.includes('src\\security\\rules')) {
      return [];
    }

    for (const rule of this.rules) {
      const results = rule.scan(filePath, content, modifiedLines);
      for (const res of results) {
        const key = `${res.filePath}:${res.line}:${res.ruleId}`;
        if (!seen.has(key)) {
          seen.add(key);
          findings.push(res);
        }
      }
    }

    return findings;
  }

  /**
   * Scans a list of file diffs and associated content, evaluating only added/modified lines.
   */
  public scanDiffs(files: Array<{ diff: FileDiff; content: string }>): SecurityScorecard {
    const allFindings: SecurityFinding[] = [];

    for (const item of files) {
      const modifiedLines: number[] = [];
      for (const hunk of item.diff.hunks) {
        for (const dl of hunk.lines) {
          if (dl.type === 'add' && dl.newLineNumber) {
            modifiedLines.push(dl.newLineNumber);
          }
        }
      }

      const findings = this.scanContent(item.diff.newPath, item.content, modifiedLines);
      allFindings.push(...findings);
    }

    return this.buildScorecard(allFindings);
  }

  /**
   * Builds an aggregate SecurityScorecard from a collection of findings.
   */
  public buildScorecard(findings: SecurityFinding[]): SecurityScorecard {
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const f of findings) {
      if (f.severity === 'critical') criticalCount++;
      else if (f.severity === 'high') highCount++;
      else if (f.severity === 'medium') mediumCount++;
      else if (f.severity === 'low') lowCount++;
    }

    // Calculate risk score: starts at 100, decrements on findings
    let penalty = criticalCount * 25 + highCount * 15 + mediumCount * 8 + lowCount * 3;
    let riskScore = Math.max(0, 100 - penalty);

    return {
      totalFindings: findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      riskScore,
      passed: criticalCount === 0 && highCount === 0,
      findings
    };
  }
}

export const defaultLinter = new SecurityLinter();
