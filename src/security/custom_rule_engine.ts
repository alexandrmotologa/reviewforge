import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { SecurityFinding, SecurityRule, SecuritySeverity } from './types';
import { loadReviewForgeConfig } from '../config/loader';

export interface CustomRuleDefinition {
  id: string;
  title: string;
  cwe: string;
  severity: SecuritySeverity;
  pattern: string;
  remediation: string;
}

export interface RuleTestResult {
  matches: boolean;
  matchCount: number;
  matchesCount: number;
  validRegex: boolean;
  findings: SecurityFinding[];
  matchesList?: Array<{ line: number; text: string }>;
  error?: string;
}

/**
 * Creates a dynamic SecurityRule from user-defined parameters.
 */
export function createCustomRule(def: CustomRuleDefinition): SecurityRule {
  return {
    id: def.id,
    title: def.title,
    cwe: def.cwe || 'CWE-Custom',
    defaultSeverity: def.severity || 'high',
    scan(filePath: string, content: string, modifiedLines?: number[]): SecurityFinding[] {
      const findings: SecurityFinding[] = [];
      let regex: RegExp;
      try {
        regex = new RegExp(def.pattern, 'i');
      } catch {
        return findings;
      }

      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const lineNo = i + 1;
        if (modifiedLines && modifiedLines.length > 0 && !modifiedLines.includes(lineNo)) {
          continue;
        }

        const line = lines[i];
        if (regex.test(line)) {
          findings.push({
            ruleId: def.id,
            title: def.title,
            description: `Custom policy rule '${def.id}' triggered.`,
            severity: def.severity,
            cwe: def.cwe,
            filePath,
            line: lineNo,
            snippet: line.trim(),
            remediation: def.remediation
          });
        }
      }
      return findings;
    }
  };
}

/**
 * Tests a custom rule pattern against sample code in memory.
 */
export function testCustomRule(pattern: string, code: string, severity: SecuritySeverity = 'high'): RuleTestResult {
  try {
    const regex = new RegExp(pattern, 'i');
    const rule = createCustomRule({
      id: 'sandbox-test',
      title: 'Sandbox Custom Rule Test',
      cwe: 'CWE-Custom',
      severity,
      pattern,
      remediation: 'Remediate detected pattern.'
    });

    const findings = rule.scan('test_sandbox.ts', code);
    return {
      matches: findings.length > 0,
      matchCount: findings.length,
      matchesCount: findings.length,
      validRegex: true,
      findings,
      matchesList: findings.map(f => ({ line: f.line, text: f.snippet || '' }))
    };
  } catch (err: any) {
    return {
      matches: false,
      matchCount: 0,
      matchesCount: 0,
      validRegex: false,
      findings: [],
      matchesList: [],
      error: `Invalid regular expression: ${err.message}`
    };
  }
}

/**
 * Saves or updates a custom rule in .reviewforge.yml.
 */
export function saveCustomRuleToConfig(def: CustomRuleDefinition, configDir: string = process.cwd()): boolean {
  const configPath = path.join(configDir, '.reviewforge.yml');
  let currentConfig: any = {};

  if (fs.existsSync(configPath)) {
    try {
      currentConfig = YAML.parse(fs.readFileSync(configPath, 'utf8')) || {};
    } catch {
      currentConfig = {};
    }
  }

  if (!currentConfig.custom_secrets) {
    currentConfig.custom_secrets = [];
  }

  // Update existing or add new
  const existingIdx = currentConfig.custom_secrets.findIndex((r: any) => r.name === def.id || r.name === def.title);
  const entry = {
    name: def.id,
    pattern: def.pattern,
    severity: def.severity
  };

  if (existingIdx >= 0) {
    currentConfig.custom_secrets[existingIdx] = entry;
  } else {
    currentConfig.custom_secrets.push(entry);
  }

  fs.writeFileSync(configPath, YAML.stringify(currentConfig), 'utf8');
  return true;
}
